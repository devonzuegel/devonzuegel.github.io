document.addEventListener('DOMContentLoaded', function () {
  // Build ordered list of navigable images (exclude .disable-img-click children)
  var allImgs = document.getElementsByTagName('img')
  var navigableImgs = []
  for (var i = 0; i < allImgs.length; i++) {
    var img = allImgs[i]
    if (!img.closest('.disable-img-click')) {
      navigableImgs.push(img)
    }
  }

  var currentIndex = null
  var currentWrapper = null

  // Build thumbnail strip
  var thumbnailStrip = document.createElement('div')
  thumbnailStrip.className = 'lightbox-thumbnails'
  var thumbnailInner = document.createElement('div')
  thumbnailInner.className = 'lightbox-thumbnails-inner'
  thumbnailStrip.appendChild(thumbnailInner)
  var thumbnailImgs = []
  for (var k = 0; k < navigableImgs.length; k++) {
    ;(function (index) {
      var thumb = document.createElement('img')
      thumb.src = navigableImgs[index].src
      thumb.onclick = function (e) {
        e.stopPropagation()
        openLightbox(index)
      }
      thumbnailInner.appendChild(thumb)
      thumbnailImgs.push(thumb)
    })(k)
  }

  function updateThumbnails() {
    for (var t = 0; t < thumbnailImgs.length; t++) {
      thumbnailImgs[t].className = t === currentIndex ? 'active' : ''
    }
    // Shift inner row so the active thumbnail is centered over the fixed anchor.
    // Each thumbnail is 40px wide + 6px gap.
    var itemWidth = 40 + 6
    var activeMidpoint = currentIndex * itemWidth + 20
    var offset = activeMidpoint - 26 // 26 = half of anchor width (52px)
    thumbnailInner.style.transform = 'translateX(' + (-offset) + 'px)'
  }

  function openLightbox(index) {
    // Close any existing lightbox
    if (currentWrapper && currentWrapper.parentNode) {
      currentWrapper.parentNode.removeChild(currentWrapper)
    }

    currentIndex = index
    var sourceImg = navigableImgs[index]

    var fullSizedImg = sourceImg.cloneNode(true)
    fullSizedImg.className = 'full-sized-image-from-click'

    var wrapperWithBkgd = document.createElement('div')
    wrapperWithBkgd.className = 'full-sized-image-from-click--wrapper'
    wrapperWithBkgd.onclick = function () {
      closeLightbox()
    }

    var closeBtn = document.createElement('button')
    closeBtn.className = 'lightbox-close'
    closeBtn.innerHTML = '&#x2715;'
    closeBtn.onclick = function (e) {
      e.stopPropagation()
      closeLightbox()
    }

    wrapperWithBkgd.appendChild(fullSizedImg)
    wrapperWithBkgd.appendChild(closeBtn)
    wrapperWithBkgd.appendChild(thumbnailStrip)
    document.body.appendChild(wrapperWithBkgd)
    currentWrapper = wrapperWithBkgd
    updateThumbnails()
  }

  function closeLightbox() {
    if (currentWrapper && currentWrapper.parentNode) {
      currentWrapper.parentNode.removeChild(currentWrapper)
    }
    currentWrapper = null
    currentIndex = null
  }

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (currentIndex === null) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      openLightbox((currentIndex + 1) % navigableImgs.length)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      openLightbox((currentIndex - 1 + navigableImgs.length) % navigableImgs.length)
    } else if (e.key === 'Escape') {
      closeLightbox()
    }
  })

  // Attach click handlers
  for (var j = 0; j < navigableImgs.length; j++) {
    ;(function (index) {
      navigableImgs[index].addEventListener(
        'click',
        function () { openLightbox(index) },
        false
      )
    })(j)
  }
})
