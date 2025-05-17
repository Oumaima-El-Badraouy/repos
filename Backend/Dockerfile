# Étape 1 : Utiliser une image Node.js
FROM node:18

# Créer un dossier de travail
WORKDIR /app

# Copier les fichiers package.json et installer les dépendances
COPY package*.json ./
RUN npm install

# Copier tout le reste du projet
COPY . .

# Ouvrir le port 3000
EXPOSE 3000

# Démarrer l'application
CMD ["node", "server.js"]
