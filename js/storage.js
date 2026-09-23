/**
 * localStorage管理
 */

const storage = {
  PREFIX: 'check24-',

  /**
   * 初回チェックが存在するか確認
   */
  hasInitialCheck() {
    return localStorage.getItem(this.PREFIX + 'initial-date') !== null;
  },

  /**
   * 初回チェック情報を保存
   */
  saveInitialCheck(scores, date) {
    localStorage.setItem(this.PREFIX + 'initial-date', date);
    localStorage.setItem(this.PREFIX + 'initial-scores', JSON.stringify(scores));
  },

  /**
   * 初回チェック情報を取得
   */
  getInitialCheck() {
    return {
      date: localStorage.getItem(this.PREFIX + 'initial-date'),
      scores: JSON.parse(localStorage.getItem(this.PREFIX + 'initial-scores') || '{}')
    };
  },

  /**
   * 再チェックが可能か確認（初回から30日以上経過）
   */
  isRecheckAvailable() {
    if (!this.hasInitialCheck()) {
      return false;
    }

    const initialDate = new Date(localStorage.getItem(this.PREFIX + 'initial-date'));
    const today = new Date();
    const daysPassed = Math.floor((today - initialDate) / (1000 * 60 * 60 * 24));

    return daysPassed >= 30;
  },

  /**
   * 再チェック情報を保存
   */
  saveRecheckScores(scores, date) {
    localStorage.setItem(this.PREFIX + 'recheck-date', date);
    localStorage.setItem(this.PREFIX + 'recheck-scores', JSON.stringify(scores));
  },

  /**
   * 再チェック質問の回答を保存
   */
  saveRecheckAnswers(answers) {
    localStorage.setItem(this.PREFIX + 'recheck-answers', JSON.stringify(answers));
  },

  /**
   * 再チェック情報を取得
   */
  getRecheck() {
    return {
      date: localStorage.getItem(this.PREFIX + 'recheck-date'),
      scores: JSON.parse(localStorage.getItem(this.PREFIX + 'recheck-scores') || '{}'),
      answers: JSON.parse(localStorage.getItem(this.PREFIX + 'recheck-answers') || '{}')
    };
  },

  /**
   * 再チェックが存在するか確認
   */
  hasRecheck() {
    return localStorage.getItem(this.PREFIX + 'recheck-date') !== null;
  },

  /**
   * すべてのデータをクリア
   */
  clearAll() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
  },

  /**
   * 全データを取得（デバッグ用）
   */
  getAllData() {
    const data = {};
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.PREFIX));
    keys.forEach(key => {
      data[key] = localStorage.getItem(key);
    });
    return data;
  }
};
