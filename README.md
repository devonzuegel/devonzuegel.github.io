# devonzuegel.github.io

## How to update this site

#### Step 1: Download the site from devon.postach.io

```
wget \
  --recursive \
  --no-clobber \
  --page-requisites \
  --html-extension \
  --convert-links \
  --restrict-file-names=windows \
  devon.postach.io
```

<details>
  <summary>Flags explained:</summary>
  <ul>
    <li><code>--recursive:</code> This option tells wget to recursively download all files that are linked to on the website.</li>
    <li><code>--no-clobber:</code> This option tells wget not to overwrite any existing files with the same name. This is useful if you want to resume a previously interrupted download without re-downloading files that have already been downloaded.</li>
    <li><code>--page-requisites:</code> This option tells wget to download all files necessary to display the pages properly, such as images, CSS, and JavaScript files.</li>
    <li><code>--html-extension:</code> This option tells wget to save files with an .html extension, even if the original file did not have one.</li>
    <li><code>--convert-links:</code> This option tells wget to convert links in the downloaded files so that they will work when you view the files offline.</li>
    <li><code>--restrict-file-names=windows:</code> This option tells wget to modify filenames so that they will work with Windows file systems.</li>
  </ul>
</details>

#### Step 2: Copy the resulting files into this repo

In Finder, `cmd + drag` the downloaded files into this repo. Finder will ask:
> An item named “1.html” already exists in this location. Do you want to replace it with the one you’re copying?

Check "Apply to all" and then click "Replace".

#### Step 3: Push `master` to GitHub

It will take a few minutes for the changes to propagate to the live site.


## Things to improve

- [ ] `wget` downloads everything such that the `.html` extension is preserved in the path. It's good that the extension is in the filenames, but I don't want the contents of the html files themselves to point to e.g. `.../about-me.html`, because it makes the urls ugly. I want them to point to `.../about-me`. In theory this should be easy to fix, but I haven't found the right flags for `wget` to fix this.