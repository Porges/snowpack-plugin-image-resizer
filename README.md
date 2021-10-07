# snowpack-plugin-image-resizer

![npm](https://img.shields.io/npm/v/snowpack-plugin-image-resizer)

A [snowpack](https://github.com/snowpackjs/snowpack#readme) plugin for loading images and resizing them to use as responsive images.

## ⚠️ Experimental ⚠️

At the moment I have only used this with [Astro](https://github.com/snowpackjs/astro#readme). It is somewhat inspired by [responsive-loader](https://github.com/dazuaz/responsive-loader#readme), which I used to use with `webpack`.

## Usage

### Installation

First, install the package:

```sh
npm install --save-dev snowpack-plugin-image-resizer
```

Then, add the plugin to your project’s config file:

#### `snowpack.config.js`
```js
/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  plugins: [
    ["snowpack-plugin-image-resizer"]
  ],
};
```

Done! Now, any image imports (with the configured extensions) will be processed by the plugin and multiple outputs in different sizes will be generated.

The result of importing an image is a JavaScript structure with type `ImageImport`:

```ts
type ImageImport = {
    /** The original, unmodified, image URI. */
    src: string;
    /** The width of the original image. */
    width: number;
    /** The height of the original image. */
    height: number;
    /** The resized images in srcset format (for use on `<img>`).
     * Note that to use the `srcset` you will also need to provide your
     * own `sizes` attribute, which this library cannot create for you.
     * Refer to MDN’s Reponsive Images article for more. */
    srcset: string;
    /** The resized images in a structured format, in case
     * you need to do anything else with them. */
    images: {
        src: string;
        width: number;
    }[];
};
```

This means you can use the imported image as follows:

```ts
import myImage from "./myImage.png";
…
return (
  <img
   src={myImage.src}
   width={myImage.width}
   height={myImage.height}
   srcset={myImage.srcset} 
   alt="…" />
);
```

### TypeScript Support

If you are using TypeScript, you can add support for these image imports by adding a file like this to your project:

#### `images.d.ts`
```ts
declare module "*.png" {
    import { ImageImport } from "snowpack-plugin-image-resizer";
    const value: ImageImport;
    export default value;
}

declare module "*.jpeg" {
    import { ImageImport } from "snowpack-plugin-image-resizer";
    const value: ImageImport;
    export default value;
}

declare module "*.jpg" {
    import { ImageImport } from "snowpack-plugin-image-resizer";
    const value: ImageImport;
    export default value;
}

declare module "*.webp" {
    import { ImageImport } from "snowpack-plugin-image-resizer";
    const value: ImageImport;
    export default value;
}
```

## Configuring

You can also set some options. Their defaults are shown below:

#### `snowpack.config.js`
```js
/** @type {import("snowpack-plugin-image-resizer").Options} */
const imageLoaderOptions = {
  // file extensions to load
  inputs: [".jpg", ".jpeg", ".png", ".webp"],

  // target sizes to resize to
  sizes: [300, 600, 800, 1200, 1600],

  // images smaller than this are turned into data: uris
  inlineSizeLimit: 1024,
};

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  plugins: [
    ["snowpack-plugin-image-resizer", imageLoaderOptions]
  ],
};
```
