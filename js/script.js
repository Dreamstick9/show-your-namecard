document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("cards-container");
    const themeBtn = document.getElementById("theme-btn");
    const themeIcon = themeBtn.querySelector(".theme-icon");
    
    // Performance: Cache theme preference
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);

    themeBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        themeIcon.textContent = theme === "dark" ? "☀" : "☽";
    }

    // Performance: Add loading state
    container.innerHTML = '<div class="loading-spinner"></div>';

    // Performance: Implement caching with error handling
    const CACHE_KEY = 'contributors_cache';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    function getCachedData() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    return data;
                }
            }
        } catch (error) {
            console.warn('Failed to read cache:', error);
        }
        return null;
    }

    function setCachedData(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('Failed to cache data:', error);
        }
    }

    // Performance: Check cache first
    const cachedContributors = getCachedData();
    if (cachedContributors) {
        renderContributors(cachedContributors);
        return;
    }

    // Performance: Fetch with timeout and retry
    const fetchWithTimeout = (url, timeout = 10000) => {
        return Promise.race([
            fetch(url),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
        ]);
    };

    fetchWithTimeout("contributors.json")
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then((contributors) => {
            // Performance: Cache the data
            setCachedData(contributors);
            renderContributors(contributors);
        })
        .catch((err) => {
            console.error('Failed to load contributors:', err);
            container.innerHTML = `
                <div class="error-state">
                    <p>Failed to load contributors</p>
                    <button onclick="location.reload()" class="retry-btn">Retry</button>
                </div>
            `;
        });

    function renderContributors(contributors) {
        container.innerHTML = '';
        
        // Performance: Use DocumentFragment for batch DOM operations
        const fragment = document.createDocumentFragment();
        
        // SEO: Generate structured data for contributors
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Project Contributors",
            "description": "A collection of project contributors and team members",
            "itemListElement": contributors.map((contributor, index) => {
                const username = contributor.github.split("github.com/")[1].replace("/", "");
                return {
                    "@type": "Person",
                    "position": index + 1,
                    "name": contributor.name,
                    "jobTitle": contributor.role,
                    "description": contributor.bio,
                    "url": contributor.github,
                    "image": `https://github.com/${username}.png`,
                    "sameAs": [contributor.github]
                };
            })
        };

        // SEO: Update structured data in the page
        updateStructuredData(structuredData);
        
        contributors.forEach((contributor, index) => {
            const card = document.createElement("article");
            card.classList.add("card");
            card.setAttribute("itemscope", "");
            card.setAttribute("itemtype", "https://schema.org/Person");
            
            // Performance: Add staggered animation delay
            card.style.animationDelay = `${index * 0.1}s`;

            const githubURL = contributor.github;
            const username = githubURL
                .split("github.com/")[1]
                .replace("/", "");
            const avatarURL = `https://github.com/${username}.png`;

            card.innerHTML = `
                <div class="card-content">
                    <img 
                        src="${avatarURL}" 
                        alt="Profile picture of ${contributor.name}" 
                        class="avatar"
                        loading="lazy"
                        decoding="async"
                        itemprop="image"
                    >
                    <h2 class="name" itemprop="name">${contributor.name}</h2>
                    <p class="role" itemprop="jobTitle">${contributor.role}</p>
                    <p class="bio" itemprop="description">${contributor.bio}</p>
                    <a href="${contributor.github}" target="_blank" rel="noopener noreferrer" class="github-link" itemprop="url">View GitHub</a>
                </div>
            `;

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    }

    // SEO: Function to update structured data
    function updateStructuredData(data) {
        // Remove existing structured data
        const existingScript = document.querySelector('script[type="application/ld+json"]');
        if (existingScript) {
            existingScript.remove();
        }

        // Add new structured data
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
    }
});
