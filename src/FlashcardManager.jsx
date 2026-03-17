import { useState, useEffect } from 'react';
import { getAllCards, saveNewCard, deleteCardByRow } from './googleService';
import './FlashcardManager.css';

const FlashcardManager = ({ spreadsheetId, onBack }) => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchCards();
    }, [spreadsheetId]);

    const fetchCards = async () => {
        setLoading(true);
        const fetchedCards = await getAllCards(spreadsheetId);
        setCards(fetchedCards);
        setLoading(false);
    };

    const handleAddCard = async (e) => {
        e.preventDefault();
        if (!front.trim() || !back.trim()) return;

        setAdding(true);
        const newCard = {
            id: crypto.randomUUID(),
            front: front.trim(),
            back: back.trim(),
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            nextReviewDate: new Date(Date.now() - 60000).toISOString() // 設定為1分鐘前，確保立刻可複習
        };

        try {
            await saveNewCard(spreadsheetId, newCard);
            setFront('');
            setBack('');
            await fetchCards();
        } catch (err) {
            console.error("Add Card Failed:", err);
            alert("新增失敗，請檢查資料庫連網。");
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (rowIndex) => {
        if (!confirm("確定要刪除這張單字卡嗎？")) return;
        
        try {
            await deleteCardByRow(spreadsheetId, rowIndex);
            await fetchCards();
        } catch (err) {
            console.error("Delete Failed:", err);
        }
    };

    return (
        <div className="manager-container animate-fade-in">
            <div className="manager-header">
                <button className="back-btn" onClick={onBack}>← 返回儀表板</button>
                <h2 className="manager-title">管理單字卡</h2>
            </div>

            <div className="glass-panel add-card-form">
                <h3>新增卡片</h3>
                <form onSubmit={handleAddCard}>
                    <div className="input-group">
                        <label>正面 (單字/問題)</label>
                        <input 
                            type="text" 
                            value={front} 
                            onChange={(e) => setFront(e.target.value)} 
                            placeholder="例如: Apple"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>背面 (解釋/答案)</label>
                        <textarea 
                            value={back} 
                            onChange={(e) => setBack(e.target.value)} 
                            placeholder="例如: 蘋果"
                            required
                        />
                    </div>
                    <button type="submit" className="submit-btn" disabled={adding}>
                        {adding ? "儲存中..." : "新增卡片"}
                    </button>
                </form>
            </div>

            <div className="cards-list-section">
                <div className="list-header">
                    <h3>您的單字清單 (僅顯示最近10筆)</h3>
                </div>
                <div className="list-actions">
                    <a 
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="google-sheet-link"
                    >
                        前往 Google Sheet ↗
                    </a>
                </div>
                {loading ? (
                    <p className="loading-text">載入中...</p>
                ) : cards.length === 0 ? (
                    <p className="empty-text">目前還沒有單字，快新增一個吧！</p>
                ) : (
                    <div className="cards-grid">
                        {[...cards].reverse().slice(0, 10).map((card) => (
                            <div key={card.id} className="glass-panel card-item">
                                <div className="card-content">
                                    <div className="card-front">{card.front}</div>
                                    <div className="card-back">{card.back}</div>
                                </div>
                                <button className="delete-btn" onClick={() => handleDelete(card.rowIndex)}>刪除</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlashcardManager;
