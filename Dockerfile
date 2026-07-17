# syntax=docker/dockerfile:1
# Minimal static-site image for the empty toolshare-lib placeholder.
# When real app source lands, the deploy agent will regenerate this file.
FROM nginx:1.27-alpine

COPY index.html /usr/share/nginx/html/index.html
COPY README.md  /usr/share/nginx/html/README.md

# Serve on port 8080 to match the default port detected by the deploy agent.
RUN sed -i 's/listen\s\+80;/listen 8080;/' /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
