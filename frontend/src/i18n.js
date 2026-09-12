export const LANGS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
];

export const T = (lang) => ({
  en: {
    app: 'Honey Chain', healthy: 'Healthy', warning: 'Warning', critical: 'Critical',
    hives: 'Hives', predictedHarvest: 'Predicted Harvest', nextHarvest: 'Next Harvest',
    totalHives: 'Total Hives', attentionRequired: 'Attention Required', currentProduction: 'Current Honey Store',
    recentAlerts: 'Recent Alerts', liveReadings: 'Live Sensor Readings', weather: 'Weather & Floral Intelligence',
    temperature: 'Temperature', humidity: 'Humidity', weight: 'Hive Weight', sound: 'Sound / Vibration', battery: 'Battery',
    prediction: 'AI Yield Prediction', harvestDate: 'Expected Harvest Date', confidence: 'Confidence',
    simulate: 'Simulate Reading', stress: 'Stress Test', verified: 'VERIFIED HONEY', suspicious: 'SUSPICIOUS QR ACTIVITY',
    qualityScore: 'Quality Score', status: 'Status', adulteration: 'Adulteration Risk',
    scanToVerify: 'Scan the QR code on the bottle to verify this batch.', allGood: 'All systems optimum.',
    logout: 'Logout', back: 'Back',
  },
  hi: {
    app: 'हनी चेन', healthy: 'स्वस्थ', warning: 'सावधान', critical: 'गंभीर',
    hives: 'मधुमक्खी बक्से', predictedHarvest: 'अनुमानित उपज', nextHarvest: 'अगली फसल',
    totalHives: 'कुल बक्से', attentionRequired: 'ध्यान की आवश्यकता', currentProduction: 'मौजूदा शहद',
    recentAlerts: 'हाल की सूचनाएं', liveReadings: 'लाइव सेंसर डेटा', weather: 'मौसम और फूलों की स्थिति',
    temperature: 'तापमान', humidity: 'नमी', weight: 'बक्से का वजन', sound: 'ध्वनि / कंपन', battery: 'बैटरी',
    prediction: 'AI उपज अनुमान', harvestDate: 'अनुमानित फसल तिथि', confidence: 'विश्वसनीयता',
    simulate: 'रीडिंग बदलें', stress: 'स्ट्रेस टेस्ट', verified: 'प्रमाणित शहद', suspicious: 'संदिग्ध QR गतिविधि',
    qualityScore: 'गुणवत्ता स्कोर', status: 'स्थिति', adulteration: 'मिलावट जोखिम',
    scanToVerify: 'बोतल पर लगा QR कोड स्कैन करें।',
  },
  kn: {
    app: 'ಹನಿ ಚೇನ್', healthy: 'ಆರೋಗ್ಯಕರ', warning: 'ಎಚ್ಚರಿಕೆ', critical: 'ನಿರ್ಣಾಯಕ',
    hives: 'ಜೇನುಪೆಟ್ಟಿಗೆಗಳು', predictedHarvest: 'ಅಂದಾಜು ಉತ್ಪನ್ನ', nextHarvest: 'ಮುಂದಿನ ಸುಗ್ಗಿ',
    totalHives: 'ಒಟ್ಟು ಪೆಟ್ಟಿಗೆಗಳು', attentionRequired: 'ಗಮನ ಅಗತ್ಯ', currentProduction: 'ಪ್ರಸ್ತುತ ಜೇನು',
    recentAlerts: 'ಇತ್ತೀಚಿನ ಎಚ್ಚರಿಕೆಗಳು', liveReadings: 'ಲೈವ್ ಸೆನ್ಸಾರ್ ಡೇಟಾ', weather: 'ಹವಾಮಾನ ಮತ್ತು ಹೂವಿನ ಸ್ಥಿತಿ',
    temperature: 'ತಾಪಮಾನ', humidity: 'ಆರ್ದ್ರತೆ', weight: 'ಪೆಟ್ಟಿಗೆ ತೂಕ', sound: 'ಧ್ವನಿ / ಕಂಪನ', battery: 'ಬ್ಯಾಟರಿ',
    prediction: 'AI ಇಳುವರಿ ಅಂದಾಜು', harvestDate: 'ಅಂದಾಜು ಸುಗ್ಗಿ ದಿನಾಂಕ', confidence: 'ವಿಶ್ವಾಸಾರ್ಹತೆ',
    simulate: 'ರೀಡಿಂಗ್ ಬದಲಿಸಿ', stress: 'ಸ್ಟ್ರೆಸ್ ಟೆಸ್ಟ್', verified: 'ಪ್ರಮಾಣೀಕೃತ ಜೇನು', suspicious: 'ಅನುಮಾನಾಸ್ಪದ QR ಚಟುವಟಿಕೆ',
    qualityScore: 'ಗುಣಮಟ್ಟ ಅಂಕ', status: 'ಸ್ಥಿತಿ', adulteration: 'ಕಲಬೆರಕೆ ಅಪಾಯ',
    scanToVerify: 'ಬಾಟಲಿಯ ಮೇಲಿನ QR ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.',
  },
}[lang] || {});