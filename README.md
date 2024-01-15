# How to update this site

### Step 0. Publish a post from Evernote

1. Make sure it has an OpenGraph image. You may not be able to add it later without serious pain.
2. Move the post into the `📣 Postach.io` notebook
3. Add the `published` tag
4. Go to devon.postach.io to see if it updated to show the new post

### Step 1: Download the site from devon.postach.io

```sh
cd ~/dev/devon.postach.io/

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

```sh
open ~/dev/devonzuegel.github.io  # For opening this repo in Finder
```

In Finder, `cmd + drag` the downloaded files into this repo. Finder will ask:
> An item named “1.html” already exists in this location. Do you want to replace it with the one you’re copying?

Check "Apply to all" and then click "Replace".

### Step 3: Copy all posts AND pages into top level

In Finder, `cmd + drag` all files from `post/` & `page/` into the top level of this repo. This means that there will be 2 copies of each article & page, one in the top level and one in `post/`. Practically, this will result in two URLs for each article & page, such as:
- https://devonzuegel.com/post/article-name
- https://devonzuegel.com/article-name

And:
- https://devonzuegel.com/page/about-me
- https://devonzuegel.com/about-me

### Step 4: Rename references from `/post/article.html` to `/article.html` and remove the `.html` extension from index page

Run the following command:

```bash
cd ~/dev/devonzuegel.github.io
bin/clean-urls.sh .
```

### Step 5: Make sure the Twitter OpenGraph image is working

Add a line that looks like this:

```html
<meta
  name="twitter:image"
  content="https://cdn-images.postach.io/0bd25fcc-8ab1-40fe-8eef-bcafaae885c1/07546fd7-8385-4660-a165-17a38189fe1f/74c68a92-cf6b-4511-bfa0-4e38bc793fe4.jpg"
/>
```

### Step 6: Push `master` to GitHub

It will take a few minutes for the changes to propagate to the live site. You can follow along to see if the job is complete at https://github.com/devonzuegel/devonzuegel.github.io/actions.

### Step 7: Check that the OpenGraph image is working

If not, you can:
1. Change the URL slug in the CMS
2. Just paste a screenshot or image into the tweet

# Things to improve

- [ ] `wget` downloads everything such that the `.html` extension is preserved in the path. It's good that the extension is in the filenames, but I don't want the contents of the html files themselves to point to e.g. `.../about-me.html`, because it makes the urls ugly. I want them to point to `.../about-me`. In theory this should be easy to fix, but I haven't found the right flags for `wget` to fix this.
- [ ] I should also have it download the postach.io CSS, JS, etc. I thought `wget` would've already done that given the flags I gave it, but apparently not.