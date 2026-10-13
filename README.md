# Arandu

Static GitHub Pages frontend for the Arandu read-only IoT map. Set the Cloudflare
Tunnel URL in `config.js` before publishing.

The API login is handled by the server and the bearer token is kept only in
`sessionStorage`. No MQTT credentials belong in this repository.
