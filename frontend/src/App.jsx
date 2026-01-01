import { useEffect, useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from Node Backend when page loads
  useEffect(() => {
    axios.get('http://localhost:5000/api/articles')
      .then(response => {
        setArticles(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error connecting to backend:", err);
        setError("Backend is offline. Please run 'node server.js' in backend folder.");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-screen">Loading Dashboard...</div>;
  if (error) return <div className="error-screen">{error}</div>;

  return (
    <div className="container">
      <header>
        <h1>AI Content Dashboard</h1>
        <p>Comparison View: Previous vs. Updated</p>
      </header>

      {articles.map((article) => (
        <div key={article._id} className="article-card">

          {/* HEADER: Title */}
          <div className="card-header">
            <h2>{article.title}</h2>
            <span className="id-badge">ID: {article._id}</span>
          </div>

          {/* MAIN CONTENT: The Split View */}
          <div className="split-view">

            {/* LEFT SIDE: PREVIOUS */}
            <div className="column previous">
              <div className="label-badge original">PREVIOUS VERSION</div>
              <p className="meta-text">Raw content fetched from Beyond Chats API</p>

              <div className="content-box raw">
                {article.original_content}
              </div>
            </div>

            {/* RIGHT SIDE: UPDATED */}
            <div className="column updated">
              <div className="label-badge ai">UPDATED VERSION</div>
              <p className="meta-text">Enhanced by Gemini 2.5 + Web Search</p>

              <div className="content-box markdown">
                <ReactMarkdown>
                  {article.updated_content || "*Waiting for AI Processor...*"}
                </ReactMarkdown>
              </div>
            </div>

          </div>

          {/* FOOTER: References */}
          {article.reference_links && article.reference_links.length > 0 && (
            <div className="references-footer">
              <strong>🔗 citations & Sources:</strong>
              <ul>
                {article.reference_links.map((link, index) => (
                  <li key={index}>
                    <a href={link} target="_blank" rel="noreferrer">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      ))}
    </div>
  );
}

export default App;