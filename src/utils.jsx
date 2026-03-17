import React from 'react';

/**
 * 解析文字中的漢字+[平假名]或漢字+(平假名)，並轉換為 React 的 <ruby> 標籤
 * 支援格式：漢字[平假名]、漢字(平假名)、漢字（平假名）
 */
export const parseFurigana = (text) => {
    if (!text) return text;
    
    // 正則表達式：匹配連續的漢字（包含「々」），後面跟著中括號、小括號或全形小括號
    const regex = /([\u4E00-\u9FBF々]+)(?:\[([^\]]+)\]|\(([^)]+)\)|（([^）]+)）)/g;
    
    const elements = [];
    let lastIndex = 0;
    
    // 使用正則表達式尋找所有匹配
    text.replace(regex, (match, kanji, furigana1, furigana2, furigana3, offset) => {
        // 加入漢字前方的普通文字
        if (offset > lastIndex) {
            elements.push(<span key={`text-${offset}`}>{text.slice(lastIndex, offset)}</span>);
        }
        
        // 取得實際的平假名（因為有三種括號，所以取有值的那一個）
        const furigana = furigana1 || furigana2 || furigana3;
        
        // 加入 ruby 標籤
        elements.push(
            <ruby key={`ruby-${offset}`}>
                {kanji}
                <rt>{furigana}</rt>
            </ruby>
        );
        
        lastIndex = offset + match.length;
        return match;
    });
    
    // 加入剩餘的普通文字
    if (lastIndex < text.length) {
        elements.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
    }
    
    return elements.length > 0 ? elements : text;
};
