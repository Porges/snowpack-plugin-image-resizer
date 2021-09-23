import { SnowpackPluginFactory, SnowpackConfig, SnowpackPlugin, PluginLoadResult } from 'snowpack';

import { promises as fs } from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import * as mime from 'mime';

const defaultExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const defaultSizes = [300, 600, 800, 1200, 1600];
const defaultInlineSizeLimit = 1024;

export type Options = {
  inputs?: string[],
  sizes?: number[],
  inlineSizeLimit?: number,
}

export type ImageImport = {
  /** The original, unmodified, image URI. */
  src: string,
  /** The width of the original image. */
  width: number,
  /** The height of the original image. */
  height: number,

  /** The resized images in srcset format (for use on `<img>`).
   * Note that to use the `srcset` you will also need to provide your 
   * own `sizes` attribute, which this library cannot create for you. 
   * Refer to MDN’s [Reponsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
   * article for more. */
  srcset: string,

  /** The resized images in a structured format, in case
   * you need to do anything else with them. */
  images: { src: string, width: number }[],
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _checkType: SnowpackPluginFactory<Options> = plugin;

export default function plugin(snowpackConfig: SnowpackConfig, options?: Options): SnowpackPlugin {

  const inlineSizeLimit = options?.inlineSizeLimit || defaultInlineSizeLimit;
  const input = options?.inputs || defaultExtensions;
  const sizes = options?.sizes || defaultSizes;
  const output = [".js", ...input.flatMap(ext => sizes.map(s => `.${s}${ext.replace('.', '-')}`)), ...input];

  return {
    name: 'my-snowpack-plugin',
    resolve: { input, output },
    async load(obj): Promise<PluginLoadResult> {
      const { filePath, fileExt } = obj;

      const data = await fs.readFile(filePath, 'binary');
      const rawData = Buffer.from(data, 'binary');

      const img = sharp(rawData).rotate(/* handle EXIF orientation */);
      const { width, height } = await img.metadata();

      if (!width || !height) {
        throw new Error(`Image metadata not found for ${filePath}`);
      }

      if (rawData.length <= inlineSizeLimit) {
        const encoded = rawData.toString('base64');
        const mimeType = mime.getType(fileExt);

        const src = `data:${mimeType};base64,${encoded}`;
        const jsExport: ImageImport = {
          src,
          width,
          height,
          images: [{ src, width }],
          srcset: '',
        };

        return {
          [".js"]: { code: `export default ${JSON.stringify(jsExport)}` },
        }
      } else {

        const url = toUrl(snowpackConfig, filePath);
        const goodSizes = sizes.filter(s => s < width);

        const resized = await Promise.all(goodSizes.map(async size => ({
          width: size,
          src: `${url}.${size}${fileExt.replace('.', '-')}`,
          data:
            await img.clone()
              .resize(size, null)
              .jpeg({ mozjpeg: true })
              .toBuffer(),
        })));

        // include unresized version
        resized.push({
          width: width,
          src: url + fileExt, // file extension will be duplicated
          data: rawData,
        });

        const jsExport: ImageImport = {
          src: url + fileExt,
          width: width,
          height: height,

          srcset: resized.map(i => `${i.src} ${i.width}w`).join(', '),
          images: resized.map(i => ({ width: i.width, src: i.src })),
        }

        const result: PluginLoadResult = {
          [".js"]: { code: `export default ${JSON.stringify(jsExport)};` },
        };

        for (const img of resized) {
          result[path.extname(img.src)] = { code: img.data };
        }

        return result;
      }
    },
  }
}

function toUrl(cfg: SnowpackConfig, filePath: string): string {
  for (const [mount, mapping] of Object.entries(cfg.mount)) {
    if (filePath.startsWith(mount)) {
      return filePath.replace(mount, mapping.url).replace(/\\/g, '/');
    }
  }

  return filePath;
}
