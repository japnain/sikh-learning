(() => {
  const destination = document.body?.dataset.shareDestination
  if (!destination || !destination.startsWith('/') || destination.startsWith('//')) return
  window.location.replace(destination)
})()
