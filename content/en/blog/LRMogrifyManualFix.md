+++
title = 'Workaround for a Lightroom Plugin'
date = 2025-07-08T11:07:29-04:00
draft = false
tags = ["ImageMagick", "LR/Mogrify 2"]
categories = ["technical", "coding"]
keywords=["ImageMagick", "LR/Mogrify 2", "hack", "coding", "workaround", "lr mogrify", "mogrify lightroom", "lr/mogrify 2", "lr/mogrify", "lrmogrify"]
description= "Workaround for a LR/Mogrify bug"
external_banner = true
banner = "https://res.cloudinary.com/dbjekf3b7/image/upload/v1751993440/Lightroom_TY0JPyjIvv.thumb_xjfnwq.png"
banner_alt = "Image of an error message in Lightroom saying : ./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)"
banner_width = 600
banner_height = 600
authors = ["Marc Laliberté"]
+++

<hr>
If you've landed on this page while desperately searching for a solution to the frustrating LR/Mogrify 2 export error, you're not alone. In this post, I'll share the workaround I developed after hitting the same wall—specifically that pesky error that appears when trying to export images with multiple presets:

```
./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)
```

For those who want the quick solution before diving into the details, here's my TL;DR approach:

1. The plugin itself offered no direct fix
2. Leverage AI tools (ChatGPT or similar) to create ImageMagick shell scripts for your specific presets
3. Use these scripts to process images after exporting them from Lightroom

<hr>

Recently, I discovered the [LR Mogrify](https://www.photographers-toolbox.com/products/lrmogrify2.php) Lightroom plugin by Arctic Whiteness, and it's been a game-changer for my workflow.

This incredibly useful plugin handles image processing tasks that Lightroom can't do natively—like adding white borders or resizing images to specific dimensions (perfect for creating blog thumbnails with black fill areas).

As the developers describe it, this plugin is *donationware*. While the free version lets you export up to ten images, the full functionality unlocks after making a donation to support future development—a completely fair approach in my opinion.

However, I hit a snag in my workflow. The plugin works perfectly when exporting up to 10 images with the same preset, but I often need to export the same image with multiple presets (like both a small thumbnail and a web version). Every attempt resulted in this frustrating error:

{{< image-modal 
    src="https://res.cloudinary.com/dbjekf3b7/image/upload/v1751987786/Lightroom_TY0JPyjIvv_rt6syi.png" 
    width="600px"
    alt="Image of an error message in Lightroom saying : ./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)"
    caption="./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)" 
>}}

<br>

```
./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)
```

<br>

I tried every troubleshooting step imaginable—reinstalling the plugin, reinstalling [ImageMagick](https://imagemagick.org/index.php) with legacy tools, manually pointing Lightroom to the mogrify binaries—but nothing worked. For someone who regularly needs to export images in multiple formats (like responsive website versions or multi-resolution wallpapers), this limitation makes the process painfully tedious.

This roadblock sent me down a rabbit hole of researching both the plugin and ImageMagick. Here's what I learned: ImageMagick is a powerful open-source CLI tool for image manipulation, and the LR/Mogrify 2 plugin essentially acts as a bridge between Lightroom and ImageMagick's command-line interface.

This sparked an idea—since ImageMagick itself is unrestricted, why not use it directly? I began experimenting with shell scripts to process dragged-and-dropped images. While basic operations like adding borders worked well, more complex tasks (like creating multiple wallpaper versions with properly scaled watermarks) proved challenging—ironically, one of the rare cases where AI-generated code failed me. Still, I'd confirmed that multiple export presets were possible outside Lightroom, so I kept digging.

With my background in .NET backend development, debugging unfamiliar shell scripts would require some ramp-up time. Then it hit me—there must be a .NET wrapper for ImageMagick. Sure enough, I found [Magick.NET](https://github.com/dlemstra/Magick.NET) by [Dirk Lemstra](https://github.com/dlemstra), an incredibly well-designed NuGet package that implements ImageMagick's full functionality. Perfect!

I started small, creating dedicated console apps for my most-used presets:
- Adding white borders
- Watermarking images
- Generating multiple web versions
- Creating resolution-specific wallpapers
- Any combination of the above

These drag-and-drop executables worked beautifully, but I wanted more flexibility—the ability to select images from any folder, specify output paths, and choose any watermarks. So I upgraded to a WinForm application that consolidates all these functions.

Here's the current (admittedly rough-looking) UI:

{{< image-modal 
    src="https://res.cloudinary.com/dbjekf3b7/image/upload/v1751992179/ImageMagickScripts.UI_RFpzC305pi_peesra.png" 
    width="600px"
    alt="Basic winform app that uses ImageMagick for image processing"
    caption="The first draft UI for my application" 
>}}

Current capabilities:
- Process multiple selected images
- Specify custom output folders
- Apply different watermarks
- Run all my frequently used presets

For now, the preset configurations are hardcoded (centered watermarks, borders at 0.5% of the longest edge, etc.), which suits my needs perfectly. But I'm already planning enhancements—more customization options and UI improvements—that might eventually make this little app a complete replacement for the Lightroom plugin. Stay tuned for updates!