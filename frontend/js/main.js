
/* =====================================
   GEYIN - PERSONAL WARDROBE ASSISTANT
===================================== */

// Backend address
const API_URL = "http://127.0.0.1:8000";

// Application state
let token = localStorage.getItem("geyin_token");
let currentUser = localStorage.getItem("geyin_username");
let wardrobe = [];
let selectedImage = null;
let currentTemperature = null;
let currentWeatherCode = null;


// =====================================
// HTML ELEMENTS
// =====================================

const authButtons = document.getElementById("auth-buttons");
const userPanel = document.getElementById("user-panel");
const usernameDisplay = document.getElementById("username-display");

const authModal = document.getElementById("auth-modal");

const loginContainer = document.getElementById("login-form-container");
const signupContainer = document.getElementById("signup-form-container");

const authMessage = document.getElementById("auth-message");
const uploadMessage = document.getElementById("upload-message");
const outfitMessage = document.getElementById("outfit-message");

const clothingForm = document.getElementById("clothing-form");
const clothingImage = document.getElementById("clothing-image");
const imagePreview = document.getElementById("image-preview");

const wardrobeList = document.getElementById("wardrobe-list");
const clothingCount = document.getElementById("clothing-count");


// =====================================
// HELPER FUNCTIONS
// =====================================

function showMessage(element, message, type) {
    element.textContent = message;
    element.className = "message " + type;
}

function clearMessage(element) {
    element.textContent = "";
    element.className = "message";
}

async function apiRequest(endpoint, options = {}) {

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = "Bearer " + token;
    }

    const response = await fetch(API_URL + endpoint, {
        ...options,
        headers: headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.detail || data.message || "Əməliyyat zamanı xəta baş verdi."
        );
    }

    return data;
}


// =====================================
// AUTHENTICATION
// =====================================

function updateAuthUI() {

    if (token) {

        authButtons.classList.add("hidden");
        userPanel.classList.remove("hidden");

        usernameDisplay.textContent = currentUser || "İstifadəçi";

    } else {

        authButtons.classList.remove("hidden");
        userPanel.classList.add("hidden");

    }
}


function openLogin() {

    authModal.classList.remove("hidden");

    loginContainer.classList.remove("hidden");
    signupContainer.classList.add("hidden");

    clearMessage(authMessage);

}


function openSignup() {

    authModal.classList.remove("hidden");

    signupContainer.classList.remove("hidden");
    loginContainer.classList.add("hidden");

    clearMessage(authMessage);

}


document.getElementById("show-login").addEventListener("click", openLogin);

document.getElementById("show-signup").addEventListener("click", openSignup);

document.getElementById("switch-signup").addEventListener("click", openSignup);

document.getElementById("switch-login").addEventListener("click", openLogin);

document.getElementById("close-modal").addEventListener("click", function () {
    authModal.classList.add("hidden");
});

authModal.addEventListener("click", function (event) {

    if (event.target === authModal) {
        authModal.classList.add("hidden");
    }

});


// SIGN UP

document.getElementById("signup-form").addEventListener("submit", async function (event) {

    event.preventDefault();

    clearMessage(authMessage);

    const username = document.getElementById("signup-username").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    try {

        const result = await apiRequest("/auth/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        });

        showMessage(
            authMessage,
            "Qeydiyyat uğurla tamamlandı. İndi daxil ola bilərsən.",
            "success"
        );

        document.getElementById("login-email").value = email;

        document.getElementById("signup-form").reset();

        setTimeout(openLogin, 1200);

    } catch (error) {

        showMessage(authMessage, error.message, "error");

    }

});


// LOGIN

document.getElementById("login-form").addEventListener("submit", async function (event) {

    event.preventDefault();

    clearMessage(authMessage);

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {

        const result = await apiRequest("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        token = result.access_token;

        currentUser = email;

        localStorage.setItem("geyin_token", token);
        localStorage.setItem("geyin_username", currentUser);

        authModal.classList.add("hidden");

        document.getElementById("login-form").reset();

        updateAuthUI();

        await loadWardrobe();

    } catch (error) {

        showMessage(authMessage, error.message, "error");

    }

});


// LOGOUT

document.getElementById("logout-button").addEventListener("click", function () {

    token = null;
    currentUser = null;
    wardrobe = [];

    localStorage.removeItem("geyin_token");
    localStorage.removeItem("geyin_username");

    updateAuthUI();
    renderWardrobe();
    renderEmptyOutfit();

    showMessage(
        outfitMessage,
        "Hesabdan çıxış edildi.",
        "success"
    );

});


// =====================================
// IMAGE SELECTION AND PREVIEW
// =====================================

clothingImage.addEventListener("change", function () {

    const file = clothingImage.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {

        showMessage(uploadMessage, "Zəhmət olmasa şəkil faylı seç.", "error");

        clothingImage.value = "";
        selectedImage = null;

        return;

    }

    const reader = new FileReader();

    reader.onload = function (event) {

        imagePreview.src = event.target.result;

        imagePreview.classList.remove("hidden");

        selectedImage = event.target.result;

        clearMessage(uploadMessage);

    };

    reader.readAsDataURL(file);

});


// =====================================
// IMAGE COMPRESSION
// =====================================

function compressImage(imageData) {

    return new Promise(function (resolve, reject) {

        const image = new Image();

        image.onload = function () {

            const canvas = document.createElement("canvas");

            const maxSize = 900;

            let width = image.width;
            let height = image.height;

            if (width > height && width > maxSize) {

                height = Math.round(height * maxSize / width);
                width = maxSize;

            } else if (height > maxSize) {

                width = Math.round(width * maxSize / height);
                height = maxSize;

            }

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d");

            context.drawImage(image, 0, 0, width, height);

            resolve(canvas.toDataURL("image/jpeg", 0.75));

        };

        image.onerror = function () {
            reject(new Error("Şəkli hazırlamaq mümkün olmadı."));
        };

        image.src = imageData;

    });

}


// =====================================
// ADD CLOTHING TO WARDROBE
// =====================================

clothingForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    clearMessage(uploadMessage);

    if (!token) {

        showMessage(
            uploadMessage,
            "Geyim əlavə etmək üçün əvvəlcə hesabına daxil ol.",
            "error"
        );

        openLogin();
        return;

    }

    if (!selectedImage) {

        showMessage(uploadMessage, "Əvvəlcə geyim şəkli seç.", "error");

        return;

    }

    const name = document.getElementById("clothing-name").value.trim();

    const category = document.getElementById("clothing-category").value;

    const color = document.getElementById("clothing-color").value.trim();

    const season = document.getElementById("clothing-season").value;

    try {

        showMessage(uploadMessage, "Geyim əlavə edilir...", "success");

        const compressedImage = await compressImage(selectedImage);

        const result = await apiRequest("/wardrobe/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                category: category,
                color: color || null,
                season: season,
                image_url: compressedImage
            })
        });

        clothingForm.reset();

        selectedImage = null;

        imagePreview.src = "";
        imagePreview.classList.add("hidden");

        showMessage(uploadMessage, "Geyim qarderobuna əlavə edildi!", "success");

        await loadWardrobe();

    } catch (error) {

        showMessage(uploadMessage, error.message, "error");

    }

});


// =====================================
// LOAD WARDROBE FROM BACKEND
// =====================================

async function loadWardrobe() {

    if (!token) {
        wardrobe = [];
        renderWardrobe();
        return;
    }

    try {

        const result = await apiRequest("/wardrobe/");

        wardrobe = Array.isArray(result)
            ? result
            : (result.items || result.clothes || []);

        renderWardrobe();

    } catch (error) {

        showMessage(uploadMessage, error.message, "error");

        if (error.message.toLowerCase().includes("token") ||
            error.message.toLowerCase().includes("credential")) {

            token = null;

            localStorage.removeItem("geyin_token");

            updateAuthUI();

        }

    }

}


// =====================================
// DISPLAY WARDROBE
// =====================================

function renderWardrobe() {

    clothingCount.textContent = wardrobe.length + " geyim";

    wardrobeList.innerHTML = "";

    if (wardrobe.length === 0) {

        wardrobeList.innerHTML = `
            <div class="empty-state">
                <span>👕</span>
                <p>Hələ qarderobuna geyim əlavə etməmisən.</p>
            </div>
        `;

        return;

    }

    wardrobe.forEach(function (item) {

        const card = document.createElement("div");

        card.className = "clothing-card";

        const image = document.createElement("img");

        image.src = item.image_url || "";
        image.alt = item.name || "Geyim";

        const info = document.createElement("div");

        info.className = "clothing-info";

        const name = document.createElement("h4");
        name.textContent = item.name;

        const category = document.createElement("p");
        category.textContent = item.category || "";

        const color = document.createElement("p");
        color.textContent = item.color || "Rəng qeyd edilməyib";

        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-clothing";
        deleteButton.textContent = "Sil";

        deleteButton.addEventListener("click", function () {
            deleteClothing(item.id ?? item.clothing_id);
        });

        info.appendChild(name);
        info.appendChild(category);
        info.appendChild(color);
        info.appendChild(deleteButton);

        card.appendChild(image);
        card.appendChild(info);

        wardrobeList.appendChild(card);

    });

}


// =====================================
// DELETE CLOTHING
// =====================================

async function deleteClothing(id) {

    if (id === undefined || id === null) {
        showMessage(uploadMessage, "Geyimin ID-si tapılmadı.", "error");
        return;
    }

    const confirmed = confirm("Bu geyimi qarderobdan silmək istəyirsən?");

    if (!confirmed) {
        return;
    }

    try {

        await apiRequest("/wardrobe/" + id, {
            method: "DELETE"
        });

        showMessage(uploadMessage, "Geyim silindi.", "success");

        await loadWardrobe();

    } catch (error) {

        showMessage(uploadMessage, error.message, "error");

    }

}


// =====================================
// WEATHER INFORMATION
// OPEN-METEO API
// =====================================

function getWeatherDescription(code) {

    if (code === 0) return "Açıq hava";
    if ([1, 2].includes(code)) return "Az buludlu";
    if (code === 3) return "Buludlu";
    if ([45, 48].includes(code)) return "Dumanlı";
    if ([51, 53, 55, 56, 57].includes(code)) return "Çiskin";
    if ([61, 63, 65, 66, 67].includes(code)) return "Yağışlı";
    if ([71, 73, 75, 77].includes(code)) return "Qarlı";
    if ([80, 81, 82].includes(code)) return "Güclü yağış";
    if ([85, 86].includes(code)) return "Qar yağışı";
    if ([95, 96, 99].includes(code)) return "Şimşəkli";

    return "Dəyişkən hava";

}


function getWeatherIcon(code) {

    if (code === 0) return "☀️";
    if ([1, 2].includes(code)) return "🌤️";
    if ([3, 45, 48].includes(code)) return "☁️";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";

    return "🌤️";

}


async function loadWeather(latitude, longitude, locationName) {

    const url =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=" + latitude +
        "&longitude=" + longitude +
        "&current=temperature_2m,precipitation,wind_speed_10m,weather_code" +
        "&daily=precipitation_probability_max" +
        "&timezone=auto";

    try {

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Hava məlumatını əldə etmək mümkün olmadı.");
        }

        const data = await response.json();

        const current = data.current;

        currentTemperature = current.temperature_2m;

        currentWeatherCode = current.weather_code;

        document.getElementById("weather-city").textContent = locationName;

        document.getElementById("weather-temperature").textContent =
            Math.round(currentTemperature) + "°C";

        document.getElementById("weather-wind").textContent =
            current.wind_speed_10m + " km/s";

        document.getElementById("weather-rain").textContent =
            (data.daily.precipitation_probability_max[0] ?? 0) + "%";

        document.getElementById("weather-description").textContent =
            getWeatherDescription(currentWeatherCode);

        document.getElementById("weather-icon").textContent =
            getWeatherIcon(currentWeatherCode);

    } catch (error) {

        document.getElementById("weather-city").textContent = "Hava məlumatı alınmadı";

        showMessage(outfitMessage, error.message, "error");

    }

}


// GET USER LOCATION

function getUserWeather() {

    document.getElementById("weather-city").textContent =
        "Məkan müəyyən edilir...";

    if (!navigator.geolocation) {

        loadWeather(40.4093, 49.8671, "Bakı");

        return;

    }

    navigator.geolocation.getCurrentPosition(

        function (position) {

            loadWeather(
                position.coords.latitude,
                position.coords.longitude,
                "Cari məkanınız"
            );

        },

        function () {

            loadWeather(40.4093, 49.8671, "Bakı");

        },

        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000
        }

    );

}


document.getElementById("refresh-weather").addEventListener("click", function () {

    getUserWeather();

});


// =====================================
// WEATHER-BASED OUTFIT RECOMMENDATION
// =====================================

function renderEmptyOutfit() {

    document.getElementById("outfit-result").innerHTML = `
        <div class="empty-state">
            <span>👗</span>
            <p>Sənin kombinin burada görünəcək.</p>
        </div>
    `;

    document.getElementById("outfit-description").textContent =
        "Kombin təklifi almaq üçün əvvəlcə qarderobuna geyim əlavə et.";

}


function generateOutfit() {

    clearMessage(outfitMessage);

    if (!token) {

        showMessage(
            outfitMessage,
            "Kombin əldə etmək üçün hesabına daxil ol.",
            "error"
        );

        openLogin();

        return;

    }

    if (wardrobe.length === 0) {

        showMessage(
            outfitMessage,
            "Əvvəlcə qarderobuna geyim əlavə et.",
            "error"
        );

        return;

    }

    if (currentTemperature === null) {

        showMessage(
            outfitMessage,
            "Əvvəlcə hava məlumatlarının yüklənməsini gözlə.",
            "error"
        );

        return;

    }

    const isCold = currentTemperature < 12;

    const isWarm = currentTemperature >= 23;

    const isRainy = [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]
        .includes(currentWeatherCode);

    const selectedItems = [];

    const categories = wardrobe.map(function (item) {
        return (item.category || "").toLowerCase();
    });

    // Find suitable clothing
    function findItem(keywords, excluded = []) {

        const available = wardrobe.filter(function (item) {

            const category = (item.category || "").toLowerCase();

            const matches = keywords.some(function (keyword) {
                return category.includes(keyword);
            });

            const alreadySelected = selectedItems.some(function (selected) {
                return selected.id === item.id;
            });

            const season = (item.season || "").toLowerCase();

            let seasonSuitable = true;

            if (isCold && season === "yay") {
                seasonSuitable = false;
            }

            if (isWarm && season === "qış") {
                seasonSuitable = false;
            }

            if (season === "bütün mövsümlər") {
                seasonSuitable = true;
            }

            return matches &&
                !alreadySelected &&
                !excluded.includes(item.id) &&
                seasonSuitable;

        });

        if (available.length === 0) {
            return null;
        }

        return available[Math.floor(Math.random() * available.length)];

    }

    // Dress can be a complete outfit
    const dress = findItem(["don"]);

    if (dress) {

        selectedItems.push(dress);

    } else {

        const top = findItem(["üst geyimi"]);

        const bottom = findItem(["alt geyimi"]);

        if (top) selectedItems.push(top);

        if (bottom) selectedItems.push(bottom);

    }

    // Shoes
    const shoes = findItem(["ayaqqabı"]);

    if (shoes) {
        selectedItems.push(shoes);
    }

    // Outerwear when cold
    if (isCold) {

        const jacket = findItem(["gödəkçə", "üst geyim"]);

        if (jacket) {
            selectedItems.push(jacket);
        }

    }

    // Rain suitable outerwear
    if (isRainy) {

        const rainItem = findItem(["gödəkçə", "üst geyim"]);

        if (rainItem) {
            selectedItems.push(rainItem);
        }

    }

    // Add an accessory if available
    const accessory = findItem(["aksesuar"]);

    if (accessory) {
        selectedItems.push(accessory);
    }

    if (selectedItems.length === 0) {

        showMessage(
            outfitMessage,
            "Bu hava şəraiti üçün uyğun geyim tapılmadı. Qarderobunu genişləndir.",
            "error"
        );

        return;

    }

    displayOutfit(selectedItems, isCold, isWarm, isRainy);

}


// =====================================
// DISPLAY OUTFIT
// =====================================

function displayOutfit(items, isCold, isWarm, isRainy) {

    const result = document.getElementById("outfit-result");

    result.innerHTML = "";

    items.forEach(function (item) {

        const card = document.createElement("div");

        card.className = "outfit-item";

        const image = document.createElement("img");

        image.src = item.image_url || "";
        image.alt = item.name || "Geyim";

        const info = document.createElement("div");

        const name = document.createElement("h4");
        name.textContent = item.name;

        const category = document.createElement("p");
        category.textContent = item.category;

        info.appendChild(name);
        info.appendChild(category);

        card.appendChild(image);
        card.appendChild(info);

        result.appendChild(card);

    });

    let description = "Sənin qarderobundan seçilmiş kombin: ";

    if (isCold) {

        description += "Hava soyuqdur. İsti geyimlərə üstünlük ver. ";

    } else if (isWarm) {

        description += "Hava istidir. Yüngül geyimlər seç. ";

    } else {

        description += "Hava mülayimdir. Rahat kombin seç. ";

    }

    if (isRainy) {

        description += "Yağıntı ehtimalına görə uyğun üst geyim götür.";

    }

    document.getElementById("outfit-description").textContent = description;

    showMessage(
        outfitMessage,
        "Sənin üçün " + items.length + " geyim seçildi!",
        "success"
    );

}


document.getElementById("generate-outfit").addEventListener("click", function () {

    generateOutfit();

});


// =====================================
// INITIALIZE APPLICATION
// =====================================

async function initializeApp() {

    updateAuthUI();

    getUserWeather();

    if (token) {

        await loadWardrobe();

    } else {

        renderWardrobe();

    }

}

initializeApp();
