import fs from "fs";
import { generateWithType, generate, t } from "polyfact";
import Parser from 'rss-parser';

const interests = [
    "Language learning",
    "Asian Cultures",
    "Programming (Rust, Golang, Linux)",
    "Rationality",
    "Self-improvement",
    "Becoming wiser",
    "Minimalism",
    "Economics",
    "Science",
    "NOT Politics",
    "NOT Drama-filled",
    "NOT Propaganda",
    "Learning about new things",
];

const parser = new Parser();

const rssUrls = [
    'https://www.ft.com/?format=rss',
    'https://www.linuxjournal.com/node/feed',
    'http://teppeisensei.com/index20.rdf',
    'https://www.economist.com/leaders/rss.xml',
];

async function RankRelevance(url: string) {
    const feed = await parser.parseURL(url);
    const items = feed.items.map((item, i) => {
        return { id: i, title: item.title };
    }).slice(0, 10);

    const resultType = t.type({
        results: t.array(t.type({
            id: t.number,
            title: t.string,
            understandableTitle: t.boolean.description("Whether the title is understandable without reading the article"),
            category: t.union([t.literal("News"), t.literal("Learning"), t.literal("Funny")]),
            subcategory: t.string.description("(e.g. 'Science', 'Politics', 'Language learning', etc..)"),
            language: t.string.description("The language the article is written in"),
            clickbait: t.number.description("A clickbait score between 0.0 and 10.0"),
            positivity: t.number.description("A positivity score between 0.0 and 10.0. (For example, a news article about war or global warming would have a low positivity score but a news article about a new scientific discovery would have a high positivity score)"),
            relevance: t.number.description("A relevance score between 0.0 and 10.0"),
        })),
    });

    const { results } = await generateWithType(`Classify theses rss entries and add scores to them. The relevance score should be based on how relevant it is to send as an daily email to someone interested in : "${JSON.stringify(interests)}": ${JSON.stringify(items)}`, resultType)

    return results.map((r:any) => ({ ...r, link: feed.items[r.id].link, author: feed.items[r.id].author }));
}

(async () => {
    const results = await Promise.all(rssUrls.map(RankRelevance));
    const combinedResults = results.flat().map(r => ({ ...r, relevance: r.relevance + 0.5 * r.positivity - 0.3 * r.clickbait }));
    const sortedResults = combinedResults.sort((a, b) => b.relevance - a.relevance);
    const top4News = sortedResults.filter(r => r.category === "News").slice(0, 4);
    const top4Learning = sortedResults.filter(r => r.category === "Learning").slice(0, 4).map(r => ({ title: r.title, link: r.link, author: r.author }));
    console.log(await generate(`Here are the top 4 news articles for today: ${JSON.stringify(top4News)} and here are the top 4 learning articles for today: ${JSON.stringify(top4Learning)}. Write the content of a daily news email to send to me summarizing theses news. Write it in markdown`))
})()
