;(function () {
  var preference = 'system'
  var colorTimer
  var cleanupTimer
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  try {
    var stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') preference = stored
  } catch (error) {
    // Storage may be disabled; the selector still works for this page.
  }

  function applyPreference() {
    if (preference === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', preference)
    document.querySelectorAll('.theme-control').forEach(updateSelector)
  }

  // Run synchronously in the head so saved overrides apply before first paint.
  // With no override, the stylesheet follows live system appearance changes.
  applyPreference()

  var choices = ['system', 'light', 'dark']
  var icons = {
    system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 21h8M12 16v5"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
  }

  function updateSelector(control) {
    control.style.setProperty('--theme-position', choices.indexOf(preference))
    control.querySelectorAll('.theme-option').forEach(function (button) {
      var selected = button.value === preference
      button.setAttribute('aria-checked', String(selected))
      button.tabIndex = selected ? 0 : -1
    })
  }

  function transitionTo(value) {
    clearTimeout(colorTimer)
    clearTimeout(cleanupTimer)
    preference = value
    document.querySelectorAll('.theme-control').forEach(updateSelector)
    if (reducedMotion.matches) {
      document.documentElement.classList.remove('theme-color-transition')
      applyPreference()
      return
    }
    // Finish the 240ms selector slide before starting the page's color fade.
    document.documentElement.classList.add('theme-color-transition')
    colorTimer = setTimeout(function () {
      applyPreference()
      cleanupTimer = setTimeout(function () {
        document.documentElement.classList.remove('theme-color-transition')
      }, 360)
    }, 270)
  }

  function choose(value) {
    if (value === preference) return
    transitionTo(value)
    try {
      if (preference === 'system') localStorage.removeItem('theme')
      else localStorage.setItem('theme', preference)
    } catch (error) {
      // Keep the current choice even when it cannot be persisted.
    }
  }

  function makeSelector() {
    var control = document.createElement('div')
    control.className = 'theme-control'
    control.setAttribute('role', 'radiogroup')
    control.setAttribute('aria-label', 'Appearance')
    var highlight = document.createElement('span')
    highlight.className = 'theme-highlight'
    highlight.setAttribute('aria-hidden', 'true')
    control.appendChild(highlight)
    choices.forEach(function (value, index) {
      var button = document.createElement('button')
      button.className = 'theme-option'
      button.type = 'button'
      button.value = value
      button.setAttribute('role', 'radio')
      var name = value.charAt(0).toUpperCase() + value.slice(1)
      button.setAttribute('aria-label', name)
      button.title = value === 'system' ? 'Follow system appearance' : name + ' mode'
      button.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + icons[value] + '</svg>'
      button.addEventListener('click', function () { choose(value) })
      button.addEventListener('keydown', function (event) {
        var next
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % 3
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + 2) % 3
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = 2
        else return
        event.preventDefault()
        choose(choices[next])
        control.querySelectorAll('.theme-option')[next].focus()
      })
      control.appendChild(button)
    })
    updateSelector(control)
    return control
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sidebar = document.querySelector('.sidebar')
    if (sidebar) {
      var wideWrap = document.createElement('div')
      wideWrap.className = 'wide-only theme-control-wrap'
      wideWrap.appendChild(makeSelector())
      sidebar.appendChild(wideWrap)
    }
    var narrow = document.querySelector('.sidebar--nav-links .narrow-only')
    if (narrow) narrow.appendChild(makeSelector())
  })

  window.addEventListener('storage', function (event) {
    if (event.key !== 'theme' && event.key !== null) return
    // Ignore events from sessionStorage.
    try {
      if (event.storageArea && event.storageArea !== localStorage) return
    } catch (error) { return }
    transitionTo(event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system')
  })
})()
