# syntax=docker/dockerfile:1

ARG NODE_VERSION=18
ARG PNPM_VERSION=8.14.1

FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV production

# Install pnpm.
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION}

WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.local/share/pnpm/store to speed up subsequent builds.
# Leverage a bind mounts to package.json and pnpm-lock.yaml to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

# Create the directory for orderImages and adjust its permissions
RUN mkdir -p /usr/src/app/orderImages && \
    chown node:node /usr/src/app/orderImages && \
    chmod 755 /usr/src/app/orderImages
# Create the directory for orderImages and adjust its permissions
RUN mkdir -p /usr/src/app/tempUploads && \
    chown node:node /usr/src/app/tempUploads && \
    chmod 755 /usr/src/app/tempUploads

# Run the application as a non-root user.
USER node

# Copy the rest of the source files into the image.
COPY --chown=node:node . .

# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
CMD ["node", "index.js"]
