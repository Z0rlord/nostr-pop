# Self-hosted Bouquet — Blossom media manager (https://github.com/flox1an/bouquet)
FROM node:22-bookworm-slim AS build

ARG BOUQUET_COMMIT=main
RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone https://github.com/flox1an/bouquet.git . \
    && git fetch --depth 1 origin "${BOUQUET_COMMIT}" \
    && git checkout -q "${BOUQUET_COMMIT}"

COPY patches/ /patches/
RUN chmod +x /patches/apply-dojopop-patches.sh && /patches/apply-dojopop-patches.sh /src

RUN npm install && npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
