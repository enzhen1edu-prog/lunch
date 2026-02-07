const API_KEY = 'b337fff3f7a344579f45e8a21409f58f';
const BASE_URL = 'https://open.neis.go.kr/hub';

// Allergy Mapping
const ALLERGY_MAP = {
    1: '난류', 2: '우유', 3: '메밀', 4: '땅콩', 5: '대두', 6: '밀', 7: '고등어', 
    8: '게', 9: '새우', 10: '돼지고기', 11: '복숭아', 12: '토마토', 13: '아황산염', 
    14: '닭고기', 15: '쇠고기', 16: '오징어', 17: '조개류(굴,전복,홍합)', 18: '잣', 19: '호두'
};

// State
let state = {
    school: JSON.parse(localStorage.getItem('selectedSchool')) || null,
    allergies: JSON.parse(localStorage.getItem('myAllergies')) || [],
    currentDate: new Date().toISOString().split('T')[0]
};

// Selectors
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const schoolSearchInput = document.getElementById('school-search-input');
const schoolSearchBtn = document.getElementById('school-search-btn');
const searchResults = document.getElementById('search-results');
const schoolSearchBlock = document.getElementById('school-search-block');
const mealDisplayBlock = document.getElementById('meal-display-block');
const mealLoading = document.getElementById('meal-loading');
const mealContainer = document.getElementById('meal-container');
const mealDateInput = document.getElementById('meal-date-input');
const selectedSchoolDisplay = document.getElementById('selected-school-info');
const schoolNameDisplay = document.getElementById('school-name-display');
const changeSchoolBtn = document.getElementById('change-school-btn');
const prevDateBtn = document.getElementById('prev-date-btn');
const nextDateBtn = document.getElementById('next-date-btn');
const allergyChecklist = document.getElementById('allergy-checklist');

// Initialize
function init() {
    renderTabs();
    renderAllergyChecklist();
    mealDateInput.value = state.currentDate;
    
    if (state.school) {
        showMealView();
    }

    addEventListeners();
}

function addEventListeners() {
    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // School Search
    schoolSearchBtn.addEventListener('click', searchSchools);
    schoolSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchSchools();
    });

    // Date Change
    mealDateInput.addEventListener('change', (e) => {
        state.currentDate = e.target.value;
        fetchMeals();
    });

    prevDateBtn.addEventListener('click', () => changeDate(-1));
    nextDateBtn.addEventListener('click', () => changeDate(1));

    // Reset School
    changeSchoolBtn.addEventListener('click', () => {
        state.school = null;
        localStorage.removeItem('selectedSchool');
        showSearchView();
    });
}

// UI Rendering Functions
function renderTabs() {
    // Already handled by classes but ensuring state consistency if needed
}

function renderAllergyChecklist() {
    allergyChecklist.innerHTML = '';
    Object.entries(ALLERGY_MAP).forEach(([id, name]) => {
        const isChecked = state.allergies.includes(id);
        const item = document.createElement('label');
        item.className = `allergy-item ${isChecked ? 'checked' : ''}`;
        item.innerHTML = `
            <input type="checkbox" value="${id}" ${isChecked ? 'checked' : ''}>
            <span>${name}</span>
        `;
        
        item.querySelector('input').addEventListener('change', (e) => {
            const val = e.target.value;
            if (e.target.checked) {
                state.allergies.push(val);
                item.classList.add('checked');
            } else {
                state.allergies = state.allergies.filter(a => a !== val);
                item.classList.remove('checked');
            }
            localStorage.setItem('myAllergies', JSON.stringify(state.allergies));
            if (state.school) fetchMeals(); // Refresh highlights
        });

        allergyChecklist.appendChild(item);
    });
}

function showMealView() {
    schoolSearchBlock.classList.add('hidden');
    mealDisplayBlock.classList.remove('hidden');
    selectedSchoolDisplay.classList.remove('hidden');
    schoolNameDisplay.textContent = state.school.SCHUL_NM;
    fetchMeals();
}

function showSearchView() {
    schoolSearchBlock.classList.remove('hidden');
    mealDisplayBlock.classList.add('hidden');
    selectedSchoolDisplay.classList.add('hidden');
    searchResults.innerHTML = '';
    schoolSearchInput.value = '';
}

function changeDate(days) {
    const d = new Date(state.currentDate);
    d.setDate(d.getDate() + days);
    state.currentDate = d.toISOString().split('T')[0];
    mealDateInput.value = state.currentDate;
    fetchMeals();
}

// API Functions
async function searchSchools() {
    const query = schoolSearchInput.value.trim();
    if (!query) return;

    searchResults.innerHTML = '<div class="spinner"></div>';

    try {
        const response = await fetch(`${BASE_URL}/schoolInfo?KEY=${API_KEY}&Type=json&SCHUL_NM=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.schoolInfo) {
            const schools = data.schoolInfo[1].row;
            displaySearchResults(schools);
        } else {
            searchResults.innerHTML = '<p class="guide-text">학교를 찾을 수 없습니다.</p>';
        }
    } catch (err) {
        searchResults.innerHTML = '<p class="guide-text">오류가 발생했습니다.</p>';
    }
}

function displaySearchResults(schools) {
    searchResults.innerHTML = '';
    schools.forEach(school => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `
            <span class="school-name">${school.SCHUL_NM}</span>
            <span class="school-addr">${school.ORG_RDNMA}</span>
        `;
        item.addEventListener('click', () => {
            state.school = {
                ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
                SD_SCHUL_CODE: school.SD_SCHUL_CODE,
                SCHUL_NM: school.SCHUL_NM
            };
            localStorage.setItem('selectedSchool', JSON.stringify(state.school));
            showMealView();
        });
        searchResults.appendChild(item);
    });
}

async function fetchMeals() {
    if (!state.school) return;

    mealContainer.innerHTML = '';
    mealLoading.classList.remove('hidden');

    const date = state.currentDate.replace(/-/g, '');
    const { ATPT_OFCDC_SC_CODE, SD_SCHUL_CODE } = state.school;

    try {
        const response = await fetch(`${BASE_URL}/mealServiceDietInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_YMD=${date}`);
        const data = await response.json();

        mealLoading.classList.add('hidden');

        if (data.mealServiceDietInfo) {
            const meals = data.mealServiceDietInfo[1].row;
            renderMeals(meals);
        } else {
            mealContainer.innerHTML = '<div class="meal-card"><h3>급식 정보가 없습니다.</h3><p class="guide-text">오늘의 급식 정보가 등록되지 않았거나 휴일일 수 있습니다.</p></div>';
        }
    } catch (err) {
        mealLoading.classList.add('hidden');
        mealContainer.innerHTML = '<p class="guide-text">정보를 가져오는 중 오류가 발생했습니다.</p>';
    }
}

function renderMeals(meals) {
    meals.forEach(meal => {
        const card = document.createElement('div');
        card.className = 'meal-card';
        
        // Clean up menu content (remove numbers and special characters for display, but keep them for allergy check)
        // NEIS format: "보리밥<br/>쇠고기미역국(5.6.16.)<br/>..."
        const rawItems = meal.DDISH_NM.split('<br/>');
        
        const menuItemsHtml = rawItems.map(item => {
            // Extract allergy numbers: e.g. "쇠고기미역국(5.6.16.)" -> [5, 6, 16]
            const allergyMatch = item.match(/\(([\d\.]+)\)/);
            const itemAllergies = allergyMatch ? allergyMatch[1].split('.') : [];
            
            // Highlight if any user allergy matches
            const hasAllergy = itemAllergies.some(a => state.allergies.includes(a));
            
            // Remove the allergy brackets for a cleaner display name
            const displayName = item.replace(/\([\d\.]+\)/g, '').trim();
            
            return `<li class="menu-item ${hasAllergy ? 'alert' : ''}">${displayName}</li>`;
        }).join('');

        card.innerHTML = `
            <h3>${meal.MMEAL_SC_NM} (${meal.CAL_INFO})</h3>
            <ul class="menu-list">
                ${menuItemsHtml}
            </ul>
        `;
        mealContainer.appendChild(card);
    });
}

// Start the app
init();
