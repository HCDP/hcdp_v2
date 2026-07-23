# --- Stage 1: Build Stage ---
FROM node:20-alpine AS build

WORKDIR /app

# Copy package management files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the Angular application for production
RUN npm run build

# --- Stage 2: Serve Stage ---
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/hcdp-v2/browser /usr/share/nginx/html

EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]