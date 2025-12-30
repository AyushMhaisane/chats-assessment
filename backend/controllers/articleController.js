const Article = require('../models/Article');

//aGet all Articles
const getArticles = async (req, res) =>
{
    try
    {
        //Sort by Newest first 
        const articles = await Article.find().sort({ createdAt: -1 });
        res.status(200).json(articles);
    }
    catch(err)
    {
        res.status(500).json({ message: err.message });
    }
};

//Create a new Article
const createArticle = async (req, res) =>
{
    const { title, url, original_content} =req.body;

    if(!title || !url)
    {
        return res.status(400).json({ message: "Title and URL are required" });
    }

    try 
    {
        // Check if article already exists
        const articleExists = await Article.findOne({ url });
        if (articleExists) 
        {
            return res.status(400).json({ message: 'Article already exists' });
        }

        const article = await Article.create({
            title,
            url,
            original_content,
        });

        res.status(201).json(article);
    } 
    catch (error) 
    {
        res.status(400).json({ message: error.message });
    } 
};

//Update an Article
const updateArticle = async (req, res) =>
{
    try
    {
        const article = await Article.findById(req.params.id);

        if(!article)
        {
            return res.status(404).json({ message: "Article not found" });
        }

        const updateArticle = await Article.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.status(200).json(updateArticle);
    }
    catch(err)
    {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getArticles,
    createArticle,
    updateArticle,
};