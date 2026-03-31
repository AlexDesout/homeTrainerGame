const ws = new WebSocket("ws://192.168.0.165:1880/ws/login");

ws.onopen = function () {
    console.log("Connecté au WebSocket pour le login");
};

ws.onmessage = function (event) {
    console.log("Message WebSocket reçu:", event.data);

    try {
        const data = JSON.parse(event.data);

        // ✅ Cas login
        if (data.login !== undefined) {
            console.log("Login reçu:", data.login);

            if (data.login === true) {
                console.log("Connexion validée");

                // ✅ Stockage
                localStorage.setItem("isLogged", "true");

                // Redirection
                window.location.href = "game.html";
            } else {
                localStorage.setItem("isLogged", "false");
            }

            return; // on stop ici pour éviter les autres traitements
        }

    } catch (e) {
        // Si ce n'est pas JSON
        const value = parseFloat(event.data);

        if (!isNaN(value)) {
            speedInput.value = value;
            console.log("Valeur numérique reçue:", value);
        } else {
            console.error("Message non reconnu:", event.data);
        }
    }
};

ws.onerror = function (error) {
    console.error("Erreur WebSocket:", error);
};

ws.onclose = function () {
    console.log("Connexion WebSocket fermée");
};