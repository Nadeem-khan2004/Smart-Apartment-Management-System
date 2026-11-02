
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

// Tenant registration
registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const message = document.getElementById("registerMessage");

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        message.textContent = data.message;

        if (response.ok) {
            message.style.color = "green";
            registerForm.reset();
        } else {
            message.style.color = "red";
        }
    } catch (error) {
        message.textContent = "Could not connect to the server.";
        message.style.color = "red";
    }
});

// Login for owners and tenants
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const message = document.getElementById("loginMessage");

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message;
            message.style.color = "red";
            return;
        }

       
message.textContent = "Login successful! Welcome, " + data.user.name;
message.style.color = "green";

// Save the login details
sessionStorage.setItem("token", data.token);
sessionStorage.setItem("user", JSON.stringify(data.user));

// Redirect according to the user's role
// Redirect according to the user's role
if (data.user.role === "owner") {
    window.location.href = "/owner.html";
} else if (data.user.role === "tenant") {
    window.location.href = "/tenant.html";
}
    } catch (error) {
        message.textContent = "Could not connect to the server.";
        message.style.color = "red";
    }
});
