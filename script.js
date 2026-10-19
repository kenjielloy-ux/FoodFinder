const API_URL = "https://www.themealdb.com/api/json/v1/1";

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const recipeContainer = document.getElementById("recipeContainer");
const recipeCount = document.getElementById("recipeCount");
const resultTitle = document.getElementById("resultTitle");
const emptyMessage = document.getElementById("emptyMessage");
const categoryFilter = document.getElementById("categoryFilter");
const areaFilter = document.getElementById("areaFilter");
const surpriseButton = document.getElementById("surpriseButton");
const loadMoreButton = document.getElementById("loadMoreButton");
const recipeModal = document.getElementById("recipeModal");
const modalContent = document.getElementById("modalContent");
const recentContainer = document.getElementById("recentContainer");
const toast = document.getElementById("toast");

let allRecipes = [];
let currentRecipes = [];
let currentFilter = "all";
let currentCategory = "all";
let currentArea = "all";
let visibleCount = 12;
let toastTimer;

let favorites = JSON.parse(localStorage.getItem("foodieFavorites")) || [];
let cookLater = JSON.parse(localStorage.getItem("foodieCookLater")) || [];
let recentlyViewed = JSON.parse(
    localStorage.getItem("foodieRecentlyViewed")
) || [];

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

async function fetchMeals(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Recipe request failed");
        }

        const data = await response.json();

        return data.meals || [];
    } catch (error) {
        console.error(error);

        recipeContainer.innerHTML = `
            <p class="loading">
                Could not load recipes. Check your internet connection
                and try again.
            </p>
        `;

        return [];
    }
}

async function loadPopularRecipes() {
    const groups = await Promise.all([
        fetchMeals(`${API_URL}/search.php?s=chicken`),
        fetchMeals(`${API_URL}/search.php?s=pasta`),
        fetchMeals(`${API_URL}/search.php?s=beef`),
        fetchMeals(`${API_URL}/search.php?s=salad`)
    ]);

    allRecipes = [
        ...new Map(
            groups.flat().map(meal => [meal.idMeal, meal])
        ).values()
    ];

    currentRecipes = allRecipes;
    resultTitle.textContent = "Popular recipes";

    populateFilters();
    displayRecipes();
}

function populateFilters() {
    const categories = [
        ...new Set(
            allRecipes.map(meal => meal.strCategory).filter(Boolean)
        )
    ].sort();

    const areas = [
        ...new Set(
            allRecipes.map(meal => meal.strArea).filter(Boolean)
        )
    ].sort();

    categoryFilter.innerHTML =
        '<option value="all">All categories</option>';

    areaFilter.innerHTML =
        '<option value="all">All cuisines</option>';

    categories.forEach(value => {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = value;

        categoryFilter.appendChild(option);
    });

    areas.forEach(value => {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = value;

        areaFilter.appendChild(option);
    });
}

async function searchRecipes(query) {
    const cleaned = query.trim();

    if (!cleaned) {
        showToast("Type a food or recipe name first.");
        return;
    }

    resultTitle.textContent = `Results for "${cleaned}"`;

    recipeContainer.innerHTML = `
        <p class="loading">Searching for delicious recipes...</p>
    `;

    emptyMessage.classList.add("hidden");

    currentFilter = "all";
    currentCategory = "all";
    currentArea = "all";

    categoryFilter.value = "all";
    areaFilter.value = "all";

    updateFilterButtons();

    const meals = await fetchMeals(
        `${API_URL}/search.php?s=${encodeURIComponent(cleaned)}`
    );

    allRecipes = meals;
    currentRecipes = meals;
    visibleCount = 12;

    populateFilters();
    displayRecipes();
}

function getFilteredRecipes() {
    let recipes = [...currentRecipes];

    if (currentFilter === "favorites") {
        recipes = recipes.filter(meal =>
            favorites.includes(meal.idMeal)
        );
    }

    if (currentFilter === "saved") {
        recipes = recipes.filter(meal =>
            cookLater.includes(meal.idMeal)
        );
    }

    if (currentCategory !== "all") {
        recipes = recipes.filter(
            meal => meal.strCategory === currentCategory
        );
    }

    if (currentArea !== "all") {
        recipes = recipes.filter(
            meal => meal.strArea === currentArea
        );
    }

    return recipes;
}

function displayRecipes() {
    const recipes = getFilteredRecipes();

    recipeContainer.innerHTML = "";

    recipeCount.textContent =
        `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"}`;

    emptyMessage.classList.toggle("hidden", recipes.length > 0);

    recipes.slice(0, visibleCount).forEach((meal, index) => {
        recipeContainer.appendChild(createRecipeCard(meal, index));
    });

    loadMoreButton.classList.toggle(
        "hidden",
        visibleCount >= recipes.length || recipes.length === 0
    );
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function createRecipeCard(meal, index) {
    const card = document.createElement("article");

    card.className = "recipe-card";
    card.style.animationDelay = `${Math.min(index * 35, 280)}ms`;

    const favorite = favorites.includes(meal.idMeal);
    const saved = cookLater.includes(meal.idMeal);

    card.innerHTML = `
        <div class="card-image-wrap">
            <img
                class="card-image"
                src="${escapeHTML(meal.strMealThumb || "")}"
                alt="${escapeHTML(meal.strMeal)}"
                loading="lazy"
            >

            <button
                class="heart ${favorite ? "active" : ""}"
                data-action="favorite"
                aria-label="Toggle favorite"
            >
                ${favorite ? "♥" : "♡"}
            </button>
        </div>

        <div class="card-body">
            <p class="category">
                ${escapeHTML(meal.strCategory || "Recipe")}
            </p>

            <h3 class="card-title">
                ${escapeHTML(meal.strMeal)}
            </h3>

            <p class="meta">
                🌍 ${escapeHTML(meal.strArea || "Worldwide")}
            </p>

            <div class="actions">
                <button class="details" data-action="details">
                    View recipe ↗
                </button>

                <button class="save" data-action="save">
                    ${saved ? "✓ Saved" : "+ Cook later"}
                </button>
            </div>
        </div>
    `;

    card.querySelector('[data-action="favorite"]')
        .addEventListener("click", () => toggleFavorite(meal));

    card.querySelector('[data-action="save"]')
        .addEventListener("click", () => toggleCookLater(meal));

    card.querySelector('[data-action="details"]')
        .addEventListener("click", () => showRecipeDetails(meal.idMeal));

    return card;
}

function toggleFavorite(meal) {
    if (favorites.includes(meal.idMeal)) {
        favorites = favorites.filter(id => id !== meal.idMeal);
        showToast("Removed from Favorites.");
    } else {
        favorites.push(meal.idMeal);
        showToast("Added to Favorites!");
    }

    localStorage.setItem(
        "foodieFavorites",
        JSON.stringify(favorites)
    );

    displayRecipes();
}

function toggleCookLater(meal) {
    if (cookLater.includes(meal.idMeal)) {
        cookLater = cookLater.filter(id => id !== meal.idMeal);
        showToast("Removed from Cook Later.");
    } else {
        cookLater.push(meal.idMeal);
        showToast("Saved to Cook Later!");
    }

    localStorage.setItem(
        "foodieCookLater",
        JSON.stringify(cookLater)
    );

    displayRecipes();
}

async function showRecipeDetails(mealId) {
    recipeModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    modalContent.innerHTML = `
        <p class="loading">Loading recipe details...</p>
    `;

    const details = await fetchMeals(
        `${API_URL}/lookup.php?i=${mealId}`
    );

    const meal = details[0] ||
        allRecipes.find(item => item.idMeal === mealId);

    if (!meal) {
        modalContent.innerHTML = `
            <p class="loading">Recipe details could not be found.</p>
        `;

        return;
    }

    recentlyViewed = recentlyViewed.filter(
        item => item.idMeal !== meal.idMeal
    );

    recentlyViewed.unshift({
        idMeal: meal.idMeal,
        strMeal: meal.strMeal,
        strMealThumb: meal.strMealThumb
    });

    recentlyViewed = recentlyViewed.slice(0, 6);

    localStorage.setItem(
        "foodieRecentlyViewed",
        JSON.stringify(recentlyViewed)
    );

    displayRecentRecipes();

    const ingredients = [];

    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];

        if (ingredient && ingredient.trim()) {
            ingredients.push(`
                <li>
                    ${escapeHTML(measure || "")}
                    ${escapeHTML(ingredient)}
                </li>
            `);
        }
    }

    modalContent.innerHTML = `
        <div class="modal-content">
            <img
                class="modal-photo"
                src="${escapeHTML(meal.strMealThumb || "")}"
                alt="${escapeHTML(meal.strMeal)}"
            >

            <div class="modal-copy">
                <p class="eyebrow">
                    ${escapeHTML(meal.strCategory || "Recipe")}
                    ·
                    ${escapeHTML(meal.strArea || "Worldwide")}
                </p>

                <h2>${escapeHTML(meal.strMeal)}</h2>

                <p>
                    Get your ingredients ready and follow the steps
                    to make this dish.
                </p>

                <div class="modal-actions">
                    <button class="button primary" id="modalFavorite">
                        ${favorites.includes(meal.idMeal)
                            ? "♥ Favorited"
                            : "♡ Add favorite"}
                    </button>

                    <button class="button outline" id="modalSave">
                        ${cookLater.includes(meal.idMeal)
                            ? "✓ Saved for later"
                            : "+ Cook later"}
                    </button>

                    ${meal.strYoutube ? `
                        <a
                            class="button outline"
                            href="${escapeHTML(meal.strYoutube)}"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Watch video ↗
                        </a>
                    ` : ""}
                </div>

                <h3>Ingredients</h3>

                <ul class="ingredients">
                    ${ingredients.length
                        ? ingredients.join("")
                        : "<li>Ingredients not listed.</li>"}
                </ul>

                <h3>Instructions</h3>

                <p class="instructions">
                    ${escapeHTML(
                        meal.strInstructions ||
                        "No instructions are available."
                    )}
                </p>

                ${meal.strSource ? `
                    <p>
                        <a
                            href="${escapeHTML(meal.strSource)}"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Original recipe source ↗
                        </a>
                    </p>
                ` : ""}
            </div>
        </div>
    `;

    document.getElementById("modalFavorite")
        .addEventListener("click", () => {
            toggleFavorite(meal);

            document.getElementById("modalFavorite").textContent =
                favorites.includes(meal.idMeal)
                    ? "♥ Favorited"
                    : "♡ Add favorite";
        });

    document.getElementById("modalSave")
        .addEventListener("click", () => {
            toggleCookLater(meal);

            document.getElementById("modalSave").textContent =
                cookLater.includes(meal.idMeal)
                    ? "✓ Saved for later"
                    : "+ Cook later";
        });
}

function displayRecentRecipes() {
    recentContainer.innerHTML = "";

    if (!recentlyViewed.length) {
        recentContainer.innerHTML = `
            <p>Your recently viewed recipes will appear here.</p>
        `;

        return;
    }

    recentlyViewed.forEach(meal => {
        const button = document.createElement("button");

        button.className = "recent-card";

        button.innerHTML = `
            <img
                src="${escapeHTML(meal.strMealThumb || "")}"
                alt="${escapeHTML(meal.strMeal)}"
                loading="lazy"
            >

            <span>${escapeHTML(meal.strMeal)}</span>
        `;

        button.addEventListener("click", () => {
            showRecipeDetails(meal.idMeal);
        });

        recentContainer.appendChild(button);
    });
}

async function surpriseMe() {
    surpriseButton.disabled = true;
    surpriseButton.textContent = "Finding one...";

    const meals = await fetchMeals(`${API_URL}/random.php`);

    surpriseButton.disabled = false;
    surpriseButton.textContent = "Surprise Me ↗";

    if (meals.length) {
        showRecipeDetails(meals[0].idMeal);
    } else {
        showToast("Could not find a random recipe. Try again.");
    }
}

function updateFilterButtons() {
    document.querySelectorAll(".filter").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filter === currentFilter
        );
    });
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchRecipes(searchInput.value);
});

document.querySelectorAll(".quick button").forEach(button => {
    button.addEventListener("click", () => {
        searchInput.value = button.dataset.query;
        searchRecipes(button.dataset.query);
    });
});

document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        visibleCount = 12;

        updateFilterButtons();
        displayRecipes();
    });
});

categoryFilter.addEventListener("change", () => {
    currentCategory = categoryFilter.value;
    visibleCount = 12;

    displayRecipes();
});

areaFilter.addEventListener("change", () => {
    currentArea = areaFilter.value;
    visibleCount = 12;

    displayRecipes();
});

loadMoreButton.addEventListener("click", () => {
    visibleCount += 8;
    displayRecipes();
});

surpriseButton.addEventListener("click", surpriseMe);

function closeRecipeModal() {
    recipeModal.classList.add("hidden");
    document.body.style.overflow = "";
}

document.getElementById("closeModal")
    .addEventListener("click", closeRecipeModal);

document.getElementById("modalBackdrop")
    .addEventListener("click", closeRecipeModal);

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeRecipeModal();
    }
});

displayRecentRecipes();
loadPopularRecipes();
