+++
title = 'Solution de contournement pour un plugin Lightroom'
date = 2025-07-08T11:07:29-04:00
draft = false
tags = ["ImageMagick", "LR/Mogrify 2"]
keywords=["ImageMagick", "LR/Mogrify 2", "hack", "programmation", "contournement", "lr mogrify", "mogrify lightroom", "lr/mogrify 2", "lr/mogrify", "lrmogrify"]
description= "Solution de contournement pour un bogue de LR/Mogrify"
categories = ["technical", "coding"]
external_banner = true
banner = "https://res.cloudinary.com/dbjekf3b7/image/upload/v1751993440/Lightroom_TY0JPyjIvv.thumb_xjfnwq.png"
banner_alt = "Image d'un message d'erreur dans Lightroom disant : ./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)"
banner_width = 600
banner_height = 600
authors = ["Marc Laliberté"]
+++


<hr>
Si vous êtes arrivé sur cette page en cherchant désespérément une solution à l'erreur d'export LR/Mogrify 2, sachez que vous n'êtes pas seul. Dans cet article, je partage la solution de contournement que j'ai développée après avoir buté sur cette même erreur particulièrement agaçante qui apparaît lorsqu'on essaie d'exporter des images avec plusieurs préréglages :


```
./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)
```

Pour ceux qui veulent une solution rapide avant de plonger dans les détails, voici mon résumé TL;DR :

1. Aucune solution directe avec le plugin lui-même
2. Utilisez des outils d'IA (ChatGPT ou similaire) pour créer des scripts shell ImageMagick adaptés à vos préréglages
3. Utilisez ces scripts pour traiter vos images après les avoir exportées depuis Lightroom

<hr>

Récemment, j'ai découvert le plugin Lightroom [LR Mogrify](https://www.photographers-toolbox.com/products/lrmogrify2.php) d'Arctic Whiteness, et il a révolutionné mon flux de travail.

Ce plugin extrêmement utile permet des traitements d'image impossibles nativement dans Lightroom - comme ajouter des bordures blanches ou redimensionner des images à des dimensions spécifiques (parfait pour créer des miniatures de blog avec des zones noires de remplissage).

Comme les développeurs le décrivent, ce plugin est un *donationware*. La version gratuite permet d'exporter jusqu'à dix images, mais la version complète s'obtient en faisant un don pour soutenir le développement futur - une approche tout à fait juste selon moi.

Cependant, j'ai rencontré un problème dans mon workflow. Le plugin fonctionne parfaitement pour exporter jusqu'à 10 images avec le même préréglage, mais j'ai souvent besoin d'exporter la même image avec plusieurs préréglages (comme une miniature et une version web). Chaque tentative générait cette erreur frustrante :

{{< image-modal 
    src="https://res.cloudinary.com/dbjekf3b7/image/upload/v1751987786/Lightroom_TY0JPyjIvv_rt6syi.png" 
    width="600px"
    alt="Image d'un message d'erreur dans Lightroom disant : ./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)"
    caption="./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)" 
>}}

<br>

```
./LRMogrifyExportTask.lua:128: attempt to index local 'handle' (a nil value) (2)
```


<br>

J'ai essayé toutes les solutions imaginables - réinstaller le plugin, réinstaller [ImageMagick](https://imagemagick.org/index.php) avec les outils legacy, pointer manuellement Lightroom vers les binaires mogrify - rien n'a fonctionné. Pour quelqu'un qui a régulièrement besoin d'exporter des images dans plusieurs formats (comme des versions responsive pour site web ou des fonds d'écran multi-résolutions), cette limitation rend le processus péniblement fastidieux.

Ce blocage m'a conduit à plonger dans la recherche sur le plugin et ImageMagick. Voici ce que j'ai appris : ImageMagick est un puissant outil open-source en ligne de commande pour la manipulation d'images, et le plugin LR/Mogrify 2 agit essentiellement comme un pont entre Lightroom et l'interface en ligne de commande d'ImageMagick.

Cela m'a donné une idée - puisque ImageMagick lui-même n'a pas de restrictions, pourquoi ne pas l'utiliser directement ? J'ai commencé à expérimenter avec des scripts shell pour traiter des images par glisser-déposer. Si les opérations basiques comme ajouter des bordures fonctionnaient bien, les tâches plus complexes (comme créer plusieurs versions de fonds d'écran avec des filigranes correctement dimensionnés) se sont avérées problématiques - ironiquement, un des rares cas où le code généré par une IA m'a lâché. Néanmoins, j'avais confirmé que les exports multiples étaient possibles en dehors de Lightroom, alors j'ai continué à creuser.

Avec mon background en développement backend .NET, déboguer des scripts shell non familiers aurait demandé un temps d'adaptation. Puis j'ai eu une révélation - il devait bien exister un wrapper .NET pour ImageMagick. Effectivement, j'ai trouvé [Magick.NET](https://github.com/dlemstra/Magick.NET) par [Dirk Lemstra](https://github.com/dlemstra), un package NuGet remarquablement bien conçu qui implémente toutes les fonctionnalités d'ImageMagick. Parfait !

J'ai commencé modestement en créant des applications console dédiées pour mes préréglages les plus utilisés :
- Ajout de bordures blanches
- Application de filigranes
- Génération de multiples versions web
- Création de fonds d'écran adaptés à différentes résolutions
- Toute combinaison des éléments ci-dessus

Ces exécutables en glisser-déposer fonctionnaient à merveille, mais je voulais plus de flexibilité - pouvoir sélectionner des images depuis n'importe quel dossier, spécifier des chemins de sortie et choisir différents filigranes. J'ai donc upgradé vers une application WinForm qui regroupe toutes ces fonctions.

Voici l'interface actuelle (je l'avoue, assez rudimentaire pour l'instant) :

{{< image-modal 
    src="https://res.cloudinary.com/dbjekf3b7/image/upload/v1751992179/ImageMagickScripts.UI_RFpzC305pi_peesra.png" 
    width="600px"
    alt="Application WinForm basique utilisant ImageMagick pour le traitement d'images"
    caption="Première ébauche de l'interface de mon application" 
>}}

Fonctionnalités actuelles :
- Traitement de plusieurs images sélectionnées
- Spécification de dossiers de sortie personnalisés
- Application de différents filigranes
- Exécution de tous mes préréglages fréquemment utilisés

Pour l'instant, les configurations des préréglages sont en dur dans le code (hardcoded) (filigranes centrés, bordures à 0.5% du côté le plus long, etc.), ce qui correspond parfaitement à mes besoins. Mais je planifie déjà des améliorations - plus d'options de personnalisation et des améliorations de l'interface - qui pourraient éventuellement faire de cette petite application un remplacement complet du plugin Lightroom.

**Mise à jour :** L'application est maintenant disponible publiquement sur GitHub! Consultez l'[article de suivi](/blog/2026/03/04/imagemagickscriptsrelease/) pour plus de détails et le lien de téléchargement.