;(function () {
  var preference = 'system'
  try {
    var stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') preference = stored
  } catch (error) {
    // Storage may be disabled; the selector still works for this page.
  }

  function applyPreference() {
    if (preference === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', preference)
    document.querySelectorAll('.theme-select').forEach(function (select) {
      select.value = preference
    })
  }

  // Run synchronously in the head so saved overrides apply before first paint.
  // With no override, the stylesheet follows live system appearance changes.
  applyPreference()

  function makeSelector() {
    var label = document.createElement('label')
    label.className = 'theme-control'
    label.appendChild(document.createTextNode('Appearance '))
    var select = document.createElement('select')
    select.className = 'theme-select'
    ;['System', 'Light', 'Dark'].forEach(function (name) {
      var option = document.createElement('option')
      option.value = name.toLowerCase()
      option.textContent = name
      select.appendChild(option)
    })
    select.value = preference
    select.addEventListener('change', function () {
      preference = select.value
      applyPreference()
      try {
        if (preference === 'system') localStorage.removeItem('theme')
        else localStorage.setItem('theme', preference)
      } catch (error) {
        // Keep the current choice even when it cannot be persisted.
      }
    })
    label.appendChild(select)
    return label
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
    preference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system'
    applyPreference()
  })
})()
