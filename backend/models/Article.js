const mongoose = require('mongoose');

const articleSchema = mongoose.Schema(
    {
        title:
        {
            type: String,
            required: [true, "Title is required"],
        },
        url:
        {
            type: String,
            required: [true, "URL is required"],
            unique: true,
        },
        original_content:
        {
            type: String,
        },
        updated_content: 
        {
            type: String, 
        },
        reference_links: 
        {
            type: [String], 
            default: [],
        },
        status: 
        {
            type: String,
            enum: ['pending', 'updated'], 
            default: 'pending',
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Article", articleSchema);