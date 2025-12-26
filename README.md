# Live Audience Word Cloud

A real-time, interactive word cloud application designed for events, workshops, and presentations. Participants enter words via their phones, and the word cloud updates instantly on a projector screen.

## 🚀 Features

* **Real-Time Updates:** The cloud grows and changes instantly as users submit words.
* **Live Editing:** Participants can edit their entries (up to 2 times) to fix spelling or change their minds.
* **Session Management:** Admin can name sessions (e.g., "Favorite Animal", "Key Takeaway") and reset the cloud for new questions without stopping the server.
* **Projector Mode:** A clean, full-screen view designed specifically for big screens.
* **Input Sanitization:** Automatically converts text to lowercase and removes spaces/punctuation to ensure a clean word cloud.
* **Admin Dashboard:** View participant data, archive past sessions, and control the flow of the event.

## 🔗 Live Demo Links

* **Participant View (Mobile):** `https://[your-app-name].onrender.com/`
* **Projector View (Screen):** `https://[your-app-name].onrender.com/live`
* **Admin Panel (Control):** `https://[your-app-name].onrender.com/admin`

*(Replace `[your-app-name]` with your actual Render URL after deployment)*

---

## 🛠️ How to Use

### 1. For Participants (The Audience)
1.  Scan the QR code pointing to the **Home URL** (`/`).
2.  Enter a Phone Number or ID to join.
3.  Type up to 5 words and click Submit.
4.  If the Admin changes the question, your screen will automatically reset.

### 2. For the Presenter (Projector View)
1.  Open the **Live URL** (`/live`) on the laptop connected to the projector.
2.  Press **F11** to enter Full Screen mode.
3.  This view hides all menus and buttons, showing only the Session Name and the Word Cloud.

### 3. For the Admin (Control Panel)
1.  Open the **Admin URL** (`/admin`) on your laptop or phone.
2.  **Start New Session:** Enter a question (e.g., "What is your mood?") and click **Set & Start**.
    * This archives the previous cloud.
    * Updates the title on the Projector and all Participant phones.
    * Wipes the current cloud clean for new answers.
3.  **View Data:** You can see a history of all past sessions and raw data in the Admin panel.

---

## 📦 Installation (Run Locally)

If you want to run this on your own computer:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/word-cloud.git](https://github.com/your-username/word-cloud.git)
    cd word-cloud
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the server:**
    ```bash
    node server.js
    ```

4.  **Open in browser:**
    Visit `http://localhost:3000`

---

## ☁️ Deployment (Free on Render)

To put this online for free:

1.  Create an account on [Render.com](https://render.com).
2.  Click **New +** -> **Web Service**.
3.  Connect this GitHub repository.
4.  Use the following settings:
    * **Runtime:** Node
    * **Build Command:** `npm install`
    * **Start Command:** `node server.js`
5.  Select the **Free Plan**.
6.  Click **Create Web Service**.

**Note:** On the free plan, the server "sleeps" after inactivity. Open the link 5 minutes before your presentation to wake it up!

---

## 🧰 Tech Stack

* **Backend:** Node.js, Express
* **Real-time Logic:** Socket.io
* **Frontend:** HTML5, CSS3
* **Visualization:** WordCloud2.js

## 📄 License

This project is open source and available for personal and educational use.
