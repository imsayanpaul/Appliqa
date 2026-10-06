const citiesByCountry = {
  India: [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Noida',
    'Gurgaon', 'Chandigarh', 'Kochi', 'Lucknow', 'Indore',
    'Coimbatore', 'Nagpur', 'Bhubaneswar', 'Thiruvananthapuram', 'Visakhapatnam'
  ],
  'United States': [
    'New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Seattle',
    'Austin', 'Boston', 'Denver', 'Atlanta', 'Dallas',
    'San Jose', 'Miami', 'Washington DC', 'Philadelphia', 'Houston',
    'Portland', 'San Diego', 'Minneapolis', 'Raleigh', 'Phoenix'
  ],
  'United Kingdom': [
    'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol',
    'Leeds', 'Glasgow', 'Liverpool', 'Cambridge', 'Oxford',
    'Belfast', 'Cardiff', 'Nottingham', 'Sheffield', 'Newcastle'
  ],
  Canada: [
    'Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary',
    'Edmonton', 'Winnipeg', 'Halifax', 'Victoria', 'Quebec City',
    'Waterloo', 'Mississauga', 'Brampton', 'Hamilton', 'Kitchener'
  ],
  Germany: [
    'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne',
    'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Hannover',
    'Nuremberg', 'Bremen', 'Bonn', 'Mannheim', 'Karlsruhe'
  ],
  Australia: [
    'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide',
    'Canberra', 'Gold Coast', 'Hobart', 'Darwin', 'Newcastle'
  ],
  Singapore: ['Singapore'],
  UAE: [
    'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah',
    'Fujairah', 'Al Ain'
  ],
  Netherlands: [
    'Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven',
    'Groningen', 'Delft', 'Leiden', 'Breda', 'Tilburg'
  ],
  Japan: [
    'Tokyo', 'Osaka', 'Yokohama', 'Kyoto', 'Nagoya',
    'Fukuoka', 'Sapporo', 'Kobe', 'Hiroshima', 'Sendai'
  ]
};

export default citiesByCountry;

// `word` appears in `text` with no letter right before or after it
function hasWord(text, word) {
    let i = text.indexOf(word);
    while (i >= 0) {
        const before = text[i - 1];
        const after = text[i + word.length];
        if (!(before && /[a-z]/.test(before)) && !(after && /[a-z]/.test(after))) return true;
        i = text.indexOf(word, i + 1);
    }
    return false;
}

// A search location from free text such as a full postal address:
// "Sukchar, Panihati, Kolkata, West Bengal 700115, India" -> "Kolkata".
// Known cities win; otherwise a short single place name is kept as typed;
// anything else (long addresses, PIN codes) gives '' so searches don't
// come back empty.
export function searchCity(text, country = '') {
    const value = String(text || '').trim();
    if (!value) return '';
    const lists = country && citiesByCountry[country]
        ? [citiesByCountry[country], ...Object.values(citiesByCountry)]
        : Object.values(citiesByCountry);
    const lower = value.toLowerCase();
    for (const list of lists) {
        const hit = list.find((city) => hasWord(lower, city.toLowerCase()));
        if (hit) return hit;
    }
    const looksLikeOnePlace = !/[,\d]/.test(value) && value.split(/\s+/).length <= 3;
    return looksLikeOnePlace ? value : '';
}
