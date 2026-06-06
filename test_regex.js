const html = `<link rel="stylesheet" crossorigin href="./assets/index-EYUqslG_.css">`;
const cssMatch = html.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/i);
console.log(cssMatch);
