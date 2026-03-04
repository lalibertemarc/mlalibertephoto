+++
title = 'ImageMagick Scripts — Now Available on GitHub'
date = 2026-03-04T10:00:00-04:00
draft = false
tags = ["ImageMagick", "LR/Mogrify 2", "Magick.NET", "open-source"]
categories = ["technical", "coding"]
keywords = ["ImageMagick", "LR/Mogrify 2", "Magick.NET", "open-source", "image processing", "watermark", "border", "wallpaper", "lr mogrify", "mogrify lightroom"]
description = "ImageMagick Scripts is now a free, open-source Windows app available on GitHub"
external_banner = true
banner = "https://res.cloudinary.com/dbjekf3b7/image/upload/v1772665871/blog/n0pjuwq6tlbwx4zlx2qe.png"
banner_alt = "Screenshot of the ImageMagick Scripts application interface"
banner_width = 786
banner_height = 593
authors = ["Marc Laliberté"]
+++

<hr>

A while back, I wrote about the frustrating [LR/Mogrify 2 export bug](/en/blog/lrmogrifymanulafix/) that breaks when you try to export images with multiple presets in Lightroom:

```
./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)
```

My workaround was a WinForm app built on [Magick.NET](https://github.com/dlemstra/Magick.NET) that did all the image processing I needed outside of Lightroom. I've kept working on it since then, and it's now on GitHub as a free download.

## What it does

ImageMagick Scripts is a Windows desktop app that processes images in batch. Pick your files, choose your presets, and let it run:

- Add black or white borders to images
- Apply watermarks (centered)
- Adjust ratio of the images
- Generate multiple web-sized versions in one go
- Create wallpapers at various resolutions
- Combine any of the above into a single operation

{{< image-modal
    src="https://res.cloudinary.com/dbjekf3b7/image/upload/v1772665871/blog/n0pjuwq6tlbwx4zlx2qe.png"
    width="600px"
    alt="Screenshot of the ImageMagick Scripts application interface"
    caption="The current ImageMagick Scripts UI"
>}}

## Download

Head over to the [GitHub releases page](https://github.com/lalibertemarc/ImageMagickScripts/releases) to grab the latest `.exe`. It's **Windows only** for now.

Got ideas for new features or ran into a bug? [Open an issue](https://github.com/lalibertemarc/ImageMagickScripts/issues) on the repo.
