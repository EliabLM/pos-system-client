# Self-Hosting Next.js Tutorial

Follow the instructions below to deploy a **Next.js app** with a **local PostgreSQL database** to a VPS, **secure** it, and connect it to a **custom domain** with **free SSL**. Watch the accompanying tutorial on YouTube: https://www.youtube.com/watch?v=2T_Dx7YgBFw

## Instructions & commands:

1. Get your VPS server on [Hostinger](https://hostinger.com/codinginflow) (Use code `CODINGINFLOW` for 10% off). Install Ubuntu 24 as the OS and set a root password.
2. Log into your server as root: `ssh root@<your-server-ip>`
3. Update Linux packages: `apt update && apt upgrade -y`
4. Create a new user: `adduser <username>`
5. Add this user to the sudo group: `usermod -aG sudo <username>`
6. Logout from your server: `logout`
7. Log in with your new user account: `ssh <username>@<your-server-ip>`
8. Check if sudo works: `sudo -v` (If you don't get an error, it's good)
9. Create the SSH key folder: `mkdir ~/.ssh && chmod 700 ~/.ssh`
10. Confirm the folder exists: `ls -a`
11. Logout again: `logout`
12. Generate an SSH key on your local machine: `ssh-keygen -t ed25519 -C "your_email@example.com"`
13. Push this SSH key to your server:
  - Windows: `scp $env:USERPROFILE/.ssh/id_ed25519.pub <username>@<your-server-ip>:~/.ssh/authorized_keys`
  - Mac: `scp ~/.ssh/id_ed25519.pub <username>@<your-server-ip>:~/.ssh/authorized_keys`
  - Linux: `ssh-copy-id <username>@<your-server-ip>`
14. Log back into your server: `ssh <username>@<your-server-ip>`
15. Open SSH configuration: `sudo nano /etc/ssh/sshd_config`
  - Disable IPv6: `AddressFamily inet`
  - Disable password: `PasswordAuthentication no`
  - Disable root login: `PermitRootLogin no`
16. If there is an included `.conf` file, make it empty. E.g. `sudo nano /etc/ssh/sshd_config.d/*.conf`
17. Restart SSH: `sudo systemctl restart ssh` (On some distros it's `sshd` instead of `ssh`)
18. Logout, verify that root + password logins are disabled
19. Log back into your server
20. Install firewall: `sudo apt install ufw`
21. Whitelist ports: `sudo ufw allow ssh` + `http` + `https`
22. Enable firewall: `sudo ufw enable`
23. Check firewall status: `sudo ufw status`
24. Open firewall rules: `sudo nano /etc/ufw/before.rules`
  - Add this to the `INPUT` block: `-A ufw-before-input -p icmp --icmp-type echo-request -j DROP`
25. Reboot the server: `sudo reboot`. Log back in once the server is reachable again.
26. Download & install Node.js:
  - `curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh`
  - `sudo -E bash nodesource_setup.sh`
  - `sudo apt-get install nodejs -y`
27. Check Node + NPM version: `node -v`, `npm -v`
28. Install Git & check version: `sudo apt install git`, `git -v`
29. Install PostgreSQL: `sudo apt install postgresql postgresql-contrib`
30. Start PostgreSQL: `sudo systemctl start postgresql.service`
31. Check if PostgreSQL is running: `sudo service postgresql status`
32. Start the Postgres prompt: `sudo -u postgres psql`
33. Run these commands inside PostgreSQL to create a database + user:
  - `CREATE DATABASE <database_name>;`
  - `CREATE USER <username> WITH ENCRYPTED PASSWORD '<password>';`
  - `ALTER ROLE <username> SET client_encoding TO 'utf8';`
  - `ALTER ROLE <username> SET default_transaction_isolation TO 'read committed';`
  - `ALTER ROLE <username> SET timezone TO 'UTC';`
  - `GRANT ALL PRIVILEGES ON DATABASE <database_name> TO <username>;`
  - `\c <database_name> postgres`
  - `GRANT ALL PRIVILEGES ON SCHEMA public TO <username>;`
34. Exit PostgreSQL: `\q`
35. Create an apps folder: `mkdir apps`
36. Navigate to /apps: `cd apps/` (Use `cd ..` to go back)
37. Git clone the sample repo (or use your own): `git clone https://github.com/codinginflow/next-self-hosting`
38. Open the project folder: `cd next-self-hosting/`
39. Create a .env file: `sudo nano .env` and add the following:
```
NEXT_PUBLIC_APP_TITLE="Self-Hosting Next.js Tutorial"
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<database_name>?schema=public"
```
40. Install NPM packages: `npm install`
41. Install Nginx: `sudo apt install nginx`
42. Create an Nginx configuration file: `sudo nano /etc/nginx/sites-available/nextjs.conf` and insert the following (Don't forget to insert your server IP):
```
server {
 listen 80;
 server_name <your-server-ip>;

 location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
  
  # Disable buffering to allow streaming responses
  proxy_buffering off;
  proxy_set_header X-Accel-Buffering no;
 }
}
```
43. Link your new configuration file: `sudo ln -s /etc/nginx/sites-available/nextjs.conf /etc/nginx/sites-enabled/`
44. Remove the default configuration: `sudo rm /etc/nginx/sites-enabled/default`
45. Check if your Nginx config is valid: `sudo nginx -t`
46. Restart Nginx: `sudo service nginx restart`
47. Push the database schema (This depends on your ORM/DB library): `npx prisma db push`
48. Build and run the project: `npm run build`, `npm start`
49. Now you can open your website at `http://<your-server-ip>` but the process will stop when you close the terminal.
50. Install [PM2](https://pm2.keymetrics.io/): `sudo npm install -g pm2`
51. Run your Next.js app via PM2: `pm2 start npm --name "nextjs" -- start`
52. Useful PM2 commands:
  - Check status: `pm2 status`
  - Show logs: `pm2 logs` (Close with `Ctrl + C`)
  - Clear logs: `pm2 flush`
  - Restart Next.js app (to apply changes): `pm2 restart nextjs`
53. Show the PM2 startup script: `pm2 startup`. Copy and execute the printed command.
54. Now, even if you reboot your server, PM2 should restart your Next.js app automatically: `sudo reboot`
55. Buy a domain, for example at [Namecheap](https://namecheap.pxf.io/c/3559246/1632743/5618)
56. Go to your Hostinger dashboard -> `DNS Manager` -> `Add Domain` and follow the instructions
57. Update the server name in your Nginx config: `sudo nano /etc/nginx/sites-available/nextjs.conf`:
  - `server_name your-domain.com www.your-domain.com;`
58. Restart Nginx: `sudo service nginx restart`
59. Install [Certbot](https://certbot.eff.org/): `sudo snap install --classic certbot`
60. Prepare Certbot command: `sudo ln -s /snap/bin/certbot /usr/bin/certbot`
61. Install SSL certificates: `sudo certbot --nginx`
62. Test automatic rewenal: `sudo certbot renew --dry-run`
  
After the DNS changes are applied (this can take up to 48h), your Next.js website will be reachable under your domain name with an active SSL certificate. Subscribe to [Coding in Flow](https://www.youtube.com/c/codinginflow?sub_confirmation=1) for more Next.js and web dev tutorials!
