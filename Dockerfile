
# 1. Use Node.js as the base environment
FROM node:22

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package files
COPY package*.json ./

# 4. Install application dependencies
RUN npm install --omit=dev

# 5. Copy application source code
COPY . .

# 6. Expose the application port
EXPOSE 8080

# 7. Start the application
CMD ["npm", "start"]
