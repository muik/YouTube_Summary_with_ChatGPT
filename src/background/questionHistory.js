import { Config } from "../config.js";

const MAX_HISTORY_SIZE = 10;
const STORAGE_KEY = "questionHistory";

/**
 * Save the question history to the storage.
 * @param {Object} videoInfo - The video info object.
 * @param {string} question - The question to save.
 */
export async function saveQuestionHistory(videoInfo, question) {
    console.debug("Saving question history:", videoInfo, question);

    const item = {
        videoInfo: {
            id: videoInfo.id,
            title: videoInfo.title,
            caption: videoInfo.caption,
        },
        question: question,
        timestamp: new Date().toISOString(),
    };

    chrome.storage.sync.get([STORAGE_KEY], (result) => {
        const history = result[STORAGE_KEY] || [];
        history.push(item);
        if (history.length > MAX_HISTORY_SIZE) {
            history.splice(0, history.length - MAX_HISTORY_SIZE);
        }

        chrome.storage.sync.set({ [STORAGE_KEY]: history }, () => {
            console.debug("Question history saved:", history);
        });
    });
}

export async function getQuestionHistory() {
    const result = await chrome.storage.sync.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || [];
}

/**
 * Get the recent questions from the history.
 * @returns {Object} - The recent questions.
 * @property {Array} questions - The recent questions.
 */
export async function getRecentQuestions() {
    const result = await chrome.storage.sync.get([STORAGE_KEY]);
    const recentItems = (result[STORAGE_KEY] || [])
        .reverse()
        .map((item) => item.question)
        .filter((item, index, self) => self.indexOf(item) === index);

    return {
        questions: recentItems.slice(0, Config.MAX_QUESTIONS_COUNT),
    };
}

const defaultFavoriteQuestions = [
    "What is the main idea of this content?",
    "Summarize this content in 5-10 bullet points",
    "What're the key points briefly?",
];

/**
 * Get the favorite questions from the history.
 * @returns {Object} - The favorite questions.
 * @property {Array} questions - The favorite questions.
 */
export async function getFavoriteQuestions() {
    const result = await chrome.storage.sync.get([STORAGE_KEY]);
    const counter = {};

    // group the questions by question and video id
    result[STORAGE_KEY].forEach((item) => {
        const videoId = item.videoInfo.id;
        const question = item.question.trim();
        if (counter[question]) {
            counter[question].videoIds.add(videoId);
            counter[question].timestamp = Math.max(
                counter[question].timestamp,
                item.timestamp
            );
        } else {
            counter[question] = {
                videoIds: new Set([videoId]),
                timestamp: item.timestamp,
            };
        }
    });

    Object.values(counter).forEach((item) => {
        item.count = item.videoIds.size;
    });

    defaultFavoriteQuestions.forEach((question) => {
        if (counter[question]) {
            counter[question].count = Math.max(counter[question].count, 2);
        } else {
            counter[question] = { count: 2, timestamp: 0 };
        }
    });

    // sort by count and timestamp, descending
    const favoriteItems = Object.keys(counter).sort((a, b) => {
        return (
            counter[b].count - counter[a].count ||
            counter[b].timestamp - counter[a].timestamp
        );
    });

    return { questions: favoriteItems.slice(0, Config.MAX_QUESTIONS_COUNT) };
}
