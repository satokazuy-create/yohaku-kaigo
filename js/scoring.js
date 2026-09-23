/**
 * スコアリング・タイプ判定ロジック
 */

const scoring = {
  config: null,

  /**
   * configを読み込む（ファイルから）
   */
  async loadConfig() {
    try {
      // config.json をサーバーから読み込む
      const response = await fetch('config/check-24.json');
      if (response.ok) {
        this.config = await response.json();
        return this.config;
      }
    } catch (e) {
      console.log('Failed to load config from file, using embedded config');
    }

    // フォールバック：HTMLに埋め込まれたconfigを使用
    if (window.CHECK24_CONFIG) {
      this.config = window.CHECK24_CONFIG;
      return this.config;
    }

    throw new Error('Config not found');
  },

  /**
   * 回答からドメイン別スコアを計算
   * @param {Object} answers - 質問ID: 回答スコア
   * @returns {Object} ドメインID: スコア
   */
  calculateScoresByDomain(answers) {
    const scores = {};

    this.config.domains.forEach(domain => {
      const domainQuestions = domain.questions;
      let total = 0;

      domainQuestions.forEach(question => {
        const answer = parseInt(answers[question.id]) || 0;
        total += answer;
      });

      scores[domain.id] = total;
    });

    return scores;
  },

  /**
   * スコアをランク付け（0-2: low, 3-5: medium, 6-9: high）
   */
  getRankByScore(score) {
    if (score <= 2) return 'low';
    if (score <= 5) return 'medium';
    return 'high';
  },

  /**
   * ドメイン情報を取得
   */
  getDomainById(domainId) {
    return this.config.domains.find(d => d.id === domainId);
  },

  /**
   * タイプ判定メイン処理
   * @param {Object} scores - ドメインID: スコア
   * @returns {Object} { type: 'single'|'composite', ...details }
   */
  determineType(scores) {
    // スコアを降順でソート
    const sortedDomains = this._sortDomainsByScore(scores);

    const topDomain = sortedDomains[0];
    const secondDomain = sortedDomains[1];

    // 1位と2位の差が1点以内で、複合タイプ候補を探す
    if (topDomain.score - secondDomain.score <= 1) {
      const composite = this._findCompositeType(topDomain, secondDomain);
      if (composite) {
        return {
          type: 'composite',
          ...composite
        };
      }
    }

    // 単一タイプを返す
    return {
      type: 'single',
      domain: topDomain.id,
      domainName: topDomain.name,
      score: topDomain.score,
      insight: topDomain.feedback.insight,
      action: topDomain.feedback.action
    };
  },

  /**
   * ドメインをスコアで降順ソート（タイの場合は優先順位を適用）
   */
  _sortDomainsByScore(scores) {
    const priorityMap = {
      'role': 1,
      'time': 2,
      'emotion': 3,
      'thought': 4,
      'relationship': 5,
      'future': 6,
      'body': 7,
      'environment': 8
    };

    return this.config.domains
      .map(domain => ({
        id: domain.id,
        name: domain.name,
        score: scores[domain.id],
        priority: priorityMap[domain.id] || 999,
        feedback: domain.feedback
      }))
      .sort((a, b) => {
        // スコアが高い順
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // スコアが同じ場合は優先順位で
        return a.priority - b.priority;
      });
  },

  /**
   * 複合タイプをマッチングして返す
   */
  _findCompositeType(topDomain, secondDomain) {
    const topId = topDomain.id;
    const secondId = secondDomain.id;

    // 定義済みの5つの複合タイプをチェック
    for (const composite of this.config.compositeTypes) {
      const domains = composite.domains;
      // 順序問わずマッチング
      if (
        (domains[0] === topId && domains[1] === secondId) ||
        (domains[0] === secondId && domains[1] === topId)
      ) {
        return {
          name: composite.name,
          domainA: topId,
          domainB: secondId,
          scoreA: topDomain.score,
          scoreB: secondDomain.score,
          insight: composite.insight,
          action: composite.action
        };
      }
    }

    return null;
  },

  /**
   * 再チェックで前回との比較を生成
   */
  compareScores(initialScores, recheckScores) {
    const comparison = {};

    Object.keys(initialScores).forEach(domainId => {
      const initial = initialScores[domainId];
      const recheck = recheckScores[domainId];
      const diff = initial - recheck;

      if (diff >= 2) {
        comparison[domainId] = {
          label: '戻ってきた余白',
          type: 'improved',
          diff: diff
        };
      } else if (diff <= -2) {
        comparison[domainId] = {
          label: '気にしてみたい余白',
          type: 'worsened',
          diff: Math.abs(diff)
        };
      } else {
        comparison[domainId] = {
          label: 'あまり変わらない余白',
          type: 'unchanged',
          diff: Math.abs(diff)
        };
      }
    });

    return comparison;
  }
};
