# How to update this site

### Step 0. Publish a post from Evernote

1. Move the post into the `📣 Postach.io` notebook
2. Add the `published` tag
3. Go to devon.postach.io to see if it updated to show the new post

### Step 1: Download the site from devon.postach.io

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
    <li><code>--html-extension:</code> This option tells wget to save files with an .html extension, even if the original file did not have one. Note that when published to devonzuegel.com (i.e. devonzuegel.github.io), the URL will work with AND without the .html extension (e.g. https://devonzuegel.com/inflation-propagates-unevenly and https://devonzuegel.com/inflation-propagates-unevenly.html both work)</li>
    <li><code>--convert-links:</code> This option tells wget to convert links in the downloaded files so that they will work when you view the files offline.</li>
    <li><code>--restrict-file-names=windows:</code> This option tells wget to modify filenames so that they will work with Windows file systems.</li>
  </ul>
</details>

### Step 2: Copy the resulting files into this repo

In Finder, `cmd + drag` the downloaded files into this repo. Finder will ask:
> An item named “1.html” already exists in this location. Do you want to replace it with the one you’re copying?

Check "Apply to all" and then click "Replace".

### Step 3: Copy all posts into top level

In Finder, `cmd + drag` all files from `post` into the top level of this repo. This means that there will be 2 copies of each article, one in the top level and one in `post/`. Practically, this will result in two URLs for each article, such as:
- https://devonzuegel.com/post/article-name
- https://devonzuegel.com/article-name

### Step 4: Rename ../post/article.html to ../article.html

Use Find and Replace to replace `/post/` with `/` in all files.

### Step 5: Push `master` to GitHub

It will take a few minutes for the changes to propagate to the live site. You can follow along to see if the job is complete at https://github.com/devonzuegel/devonzuegel.github.io/actions.


# Things to improve

- [ ] `wget` downloads everything such that the `.html` extension is preserved in the path. It's good that the extension is in the filenames, but I don't want the contents of the html files themselves to point to e.g. `.../about-me.html`, because it makes the urls ugly. I want them to point to `.../about-me`. In theory this should be easy to fix, but I haven't found the right flags for `wget` to fix this.
- [ ] I should also have it download the postach.io CSS, JS, etc. I thought `wget` would've already done that given the flags I gave it, but apparently not.