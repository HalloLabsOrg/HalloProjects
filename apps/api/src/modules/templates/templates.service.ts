import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import AdmZip from 'adm-zip';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { all?: string } = {}) {
    const where: any = {};
    if (query.all !== 'true') {
      where.isActive = true;
    }
    return this.prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }
    return template;
  }

  async upload(fileBuffer: Buffer) {
    let zip: AdmZip;
    try {
      zip = new AdmZip(fileBuffer);
    } catch (err) {
      throw new BadRequestException('Invalid zip archive');
    }

    const zipEntries = zip.getEntries();
    let templateJson: any = null;
    let schemaJson: any = null;
    let previewImageBase64: string | null = null;
    const files: Record<string, string> = {};

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const name = entry.entryName;
      if (name === 'template.json') {
        try {
          templateJson = JSON.parse(entry.getData().toString('utf8'));
        } catch (e) {
          throw new BadRequestException('Invalid JSON in template.json');
        }
      } else if (name === 'schema.json') {
        try {
          schemaJson = JSON.parse(entry.getData().toString('utf8'));
        } catch (e) {
          throw new BadRequestException('Invalid JSON in schema.json');
        }
      } else if (name === 'preview.png') {
        const imgBuffer = entry.getData();
        previewImageBase64 = `data:image/png;base64,${imgBuffer.toString('base64')}`;
      } else if (name.startsWith('files/')) {
        const relPath = name.substring('files/'.length);
        if (relPath) {
          files[relPath] = entry.getData().toString('utf8');
        }
      }
    }

    if (!templateJson) {
      throw new BadRequestException('Missing template.json in the zip root');
    }
    if (!schemaJson) {
      throw new BadRequestException('Missing schema.json in the zip root');
    }
    if (!templateJson.name || !templateJson.slug || !templateJson.version) {
      throw new BadRequestException('template.json must specify "name", "slug", and "version"');
    }
    if (Object.keys(files).length === 0) {
      throw new BadRequestException('Missing files/ folder or template files');
    }

    // Upsert using the composite unique key [slug, version]
    return this.prisma.template.upsert({
      where: {
        slug_version: {
          slug: templateJson.slug,
          version: templateJson.version,
        },
      },
      create: {
        name: templateJson.name,
        slug: templateJson.slug,
        version: templateJson.version,
        description: templateJson.description || null,
        author: templateJson.author || null,
        previewImage: previewImageBase64,
        schema: schemaJson,
        files: files,
        isActive: true,
      },
      update: {
        name: templateJson.name,
        description: templateJson.description || null,
        author: templateJson.author || null,
        previewImage: previewImageBase64 || undefined, // keep existing if not uploaded
        schema: schemaJson,
        files: files,
      },
    });
  }

  async toggle(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.template.update({
      where: { id },
      data: { isActive },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.template.delete({
      where: { id },
    });
  }

  async dryRun(id: string, values: Record<string, any>) {
    const template = await this.findOne(id);
    const schema = template.schema as any;
    const files = template.files as Record<string, string>;

    return this.renderTemplate(files, values, schema.fields || []);
  }

  async apply(id: string, projectId: string, environmentId: string, values: Record<string, any>) {
    // 1. Validate Project and Environment
    const environment = await this.prisma.environment.findFirst({
      where: {
        id: environmentId,
        projectId: projectId,
      },
    });

    if (!environment) {
      throw new BadRequestException('Selected environment does not belong to the project');
    }

    const template = await this.findOne(id);
    const schema = template.schema as any;
    const files = template.files as Record<string, string>;

    // 2. Render files
    const renderedFiles = this.renderTemplate(files, values, schema.fields || []);

    // 3. Extract environment variables from rendered .env if present
    const envContent = renderedFiles['.env'];
    if (envContent) {
      const lines = envContent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index === -1) continue;
        const key = trimmed.substring(0, index).trim();
        const value = trimmed
          .substring(index + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '');

        // Determine if secret based on schema
        const isSecret = schema.fields?.find((f: any) => f.name === key)?.isSecret || false;

        await this.prisma.environmentVariable.upsert({
          where: {
            environmentId_key: {
              environmentId,
              key,
            },
          },
          create: {
            environmentId,
            key,
            value,
            isSecret,
          },
          update: {
            value,
            isSecret,
          },
        });
      }
    }

    return {
      success: true,
      files: renderedFiles,
    };
  }

  private renderTemplate(
    files: Record<string, string>,
    values: Record<string, any>,
    schemaFields: any[],
  ): Record<string, string> {
    const rendered: Record<string, string> = {};

    // Build context with defaults
    const context: Record<string, any> = {};
    for (const field of schemaFields) {
      context[field.name] = values[field.name] !== undefined ? values[field.name] : field.default;
    }
    // Mix in all extra/supplied values
    Object.assign(context, values);

    for (const [path, content] of Object.entries(files)) {
      let renderedContent = content;

      // 1. Negated conditionals: {% if not db_enabled %}...{% endif %}
      const negatedCondRegex = /{% if not\s+([\w_]+)\s*%}([\s\S]*?){% endif %}/g;
      renderedContent = renderedContent.replace(negatedCondRegex, (_, varName, body) => {
        const val = context[varName];
        return !val ? body : '';
      });

      // 2. Standard conditionals: {% if db_enabled %}...{% endif %}
      const condRegex = /{% if\s+([\w_]+)\s*%}([\s\S]*?){% endif %}/g;
      renderedContent = renderedContent.replace(condRegex, (_, varName, body) => {
        const val = context[varName];
        return val ? body : '';
      });

      // 3. Variable substitutions: {{ variable_name }}
      const varRegex = /{{\s*([\w_]+)\s*}}/g;
      renderedContent = renderedContent.replace(varRegex, (_, varName) => {
        const val = context[varName];
        return val !== undefined ? String(val) : '';
      });

      rendered[path] = renderedContent;
    }

    return rendered;
  }
}
