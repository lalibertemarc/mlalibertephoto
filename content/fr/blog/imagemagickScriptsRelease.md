+++
title = 'ImageMagick Scripts — Maintenant disponible sur GitHub'
date = 2026-03-04T10:00:00-04:00
draft = false
tags = ["ImageMagick", "LR/Mogrify 2", "Magick.NET", "open-source"]
categories = ["technical", "coding"]
keywords = ["ImageMagick", "LR/Mogrify 2", "Magick.NET", "open-source", "traitement d'images", "filigrane", "bordure", "fond d'écran", "lr mogrify", "mogrify lightroom"]
description = "ImageMagick Scripts est maintenant une application Windows gratuite et open-source disponible sur GitHub"
external_banner = true
banner = "https://res.cloudinary.com/dbjekf3b7/image/upload/v1772665871/blog/n0pjuwq6tlbwx4zlx2qe.png"
banner_alt = "Capture d'écran de l'interface de l'application ImageMagick Scripts"
banner_width = 786
banner_height = 593
authors = ["Marc Laliberté"]
+++

<hr>

Il y a quelque temps, j'ai écrit à propos du [bogue d'export de LR/Mogrify 2](/blog/2025/07/08/lrmogrifymanualfix/) qui plante quand on essaie d'exporter des images avec plusieurs préréglages dans Lightroom :

```
./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)
```

Ma solution à l'époque était une application WinForm maison construite sur [Magick.NET](https://github.com/dlemstra/Magick.NET) qui s'occupait de tout le traitement d'image dont j'avais besoin en dehors de Lightroom. J'ai continué à travailler dessus depuis, et c'est maintenant sur GitHub en téléchargement gratuit.

## Ce que ça fait

ImageMagick Scripts est une application Windows qui traite les images en lot. Sélectionnez vos fichiers, choisissez vos préréglages, et c'est parti :

- Ajouter des bordures blanches ou noire aux images
- Ajuster le ratio de l'image
- Appliquer des filigranes (centrés)
- Générer plusieurs versions web en une seule opération
- Créer des fonds d'écran à différentes résolutions
- Combiner tout ça en une seule opération

{{< image-modal
    src="https://res.cloudinary.com/dbjekf3b7/image/upload/v1772665871/blog/n0pjuwq6tlbwx4zlx2qe.png"
    width="600px"
    alt="Capture d'écran de l'interface de l'application ImageMagick Scripts"
    caption="L'interface actuelle d'ImageMagick Scripts"
>}}

## L'obtenir

Rendez-vous sur la [page des releases GitHub](https://github.com/lalibertemarc/ImageMagickScripts/releases) pour télécharger le dernier `.exe`. C'est **Windows seulement** pour l'instant.

Des idées de fonctionnalités ou un bug à signaler? [Ouvrez un issue](https://github.com/lalibertemarc/ImageMagickScripts/issues) sur le dépôt.
