/**
 * メインアプリケーションロジック
 */

const app = {
  config: null,
  answers: {},
  currentDomainIndex: 0,
  result: null,

  /**
   * 初期化
   */
  async init() {
    try {
      console.log('app.init() called');
      // configを読み込む
      this.config = await scoring.loadConfig();
      console.log('config loaded:', this.config);

      // 初回チェック済みかどうか確認
      const hasInitial = storage.hasInitialCheck();
      console.log('hasInitialCheck:', hasInitial);

      if (hasInitial) {
        // 再チェック可能か確認
        if (storage.isRecheckAvailable()) {
          // 再チェック画面へ
          console.log('showing recheck');
          this.showRecheckResult();
        } else {
          // 結果画面を表示
          console.log('showing result');
          this.showResult();
        }
      } else {
        // 質問画面を表示
        console.log('rendering questions');
        this.renderQuestions();
      }
    } catch (error) {
      console.error('初期化エラー:', error);
      console.error('stack:', error.stack);
      alert('エラーが発生しました: ' + error.message);
    }
  },

  /**
   * 質問画面を描画
   */
  renderQuestions() {
    const container = document.getElementById('domainsContainer');
    container.innerHTML = '';

    this.config.domains.forEach((domain, index) => {
      const sectionId = `domain-${domain.id}`;
      const section = document.createElement('div');
      section.id = sectionId;
      section.className = 'questions-section';
      if (index === 0) section.classList.add('active');

      section.innerHTML = `
        <div class="domain-header">
          <h2>${domain.name}</h2>
        </div>
      `;

      domain.questions.forEach(question => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';

        let optionsHtml = '';
        const scaleLabels = ['ほとんどない', '少しある', 'ときどきある', 'よくある'];

        for (let i = 0; i < 4; i++) {
          const isChecked = this.answers[question.id] === i ? 'checked' : '';
          optionsHtml += `
            <div class="scale-option">
              <input
                type="radio"
                id="q${question.id}-${i}"
                name="q${question.id}"
                value="${i}"
                ${isChecked}
                onchange="app.updateAnswer(${question.id}, ${i})"
              >
              <label for="q${question.id}-${i}">${scaleLabels[i]}</label>
            </div>
          `;
        }

        questionDiv.innerHTML = `
          <div class="question-number">Q${question.id}</div>
          <div class="question-text">${question.text}</div>
          <div class="scale-options">
            ${optionsHtml}
          </div>
        `;

        section.appendChild(questionDiv);
      });

      container.appendChild(section);
    });

    this.updateProgress();
    this.updateButtonStates();
  },

  /**
   * 回答を更新
   */
  updateAnswer(questionId, score) {
    this.answers[questionId] = score;
    this.updateProgress();
  },

  /**
   * 進捗を更新
   */
  updateProgress() {
    const answered = Object.keys(this.answers).length;
    const total = 24;
    const percentage = (answered / total) * 100;

    document.getElementById('answeredCount').textContent = answered;
    document.getElementById('progressFill').style.width = percentage + '%';
  },

  /**
   * ボタンの状態を更新
   */
  updateButtonStates() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = this.currentDomainIndex === 0;

    if (this.currentDomainIndex === this.config.domains.length - 1) {
      nextBtn.textContent = 'チェック結果を見る →';
      nextBtn.onclick = () => this.submit();
    } else {
      nextBtn.textContent = '次へ →';
      nextBtn.onclick = () => this.nextDomain();
    }
  },

  /**
   * 前のドメインへ
   */
  previousDomain() {
    if (this.currentDomainIndex > 0) {
      this.showDomain(this.currentDomainIndex - 1);
    }
  },

  /**
   * 次のドメインへ
   */
  nextDomain() {
    if (this.currentDomainIndex < this.config.domains.length - 1) {
      this.showDomain(this.currentDomainIndex + 1);
    }
  },

  /**
   * ドメインを表示
   */
  showDomain(index) {
    // 前のセクションを非表示
    const allSections = document.querySelectorAll('#domainsContainer > div');
    allSections.forEach(s => s.classList.remove('active'));

    // 新しいセクションを表示
    const domainId = this.config.domains[index].id;
    const targetSection = document.getElementById(`domain-${domainId}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    this.currentDomainIndex = index;
    this.updateButtonStates();

    // 上にスクロール
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
  },

  /**
   * チェック結果を計算して表示
   */
  submit() {
    // 全問回答確認
    const answeredCount = Object.keys(this.answers).length;

    if (answeredCount < 24) {
      // 未回答の質問を特定
      const unansweredQuestions = [];
      for (let i = 1; i <= 24; i++) {
        if (this.answers[i] === undefined) {
          unansweredQuestions.push(i);
        }
      }

      // 未回答の質問をハイライト
      this.highlightUnansweredQuestions(unansweredQuestions);

      // アラート表示
      const count = 24 - answeredCount;
      alert(`${count}個の質問がまだ回答されていません。赤くハイライトされている質問にお答えください。`);
      return;
    }

    // スコア計算
    const scores = scoring.calculateScoresByDomain(this.answers);

    // タイプ判定
    this.result = scoring.determineType(scores);

    // 保存
    const today = new Date().toISOString().split('T')[0];
    storage.saveInitialCheck(scores, today);

    // 結果画面を表示
    this.showResult();
  },

  /**
   * 未回答の質問をハイライト
   */
  highlightUnansweredQuestions(questionIds) {
    // まず、すべてのハイライトを削除
    document.querySelectorAll('.question-item').forEach(item => {
      item.classList.remove('unanswered');
    });

    // 未回答の質問をハイライト
    questionIds.forEach(qId => {
      const questionElement = document.querySelector(`.question-item:has(input[name="q${qId}"])`);
      if (questionElement) {
        questionElement.classList.add('unanswered');
      }
    });

    // 最初の未回答箇所へスクロール
    if (questionIds.length > 0) {
      const firstUnanswered = document.querySelector(`.question-item:has(input[name="q${questionIds[0]}"])`);
      if (firstUnanswered) {
        firstUnanswered.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  },

  /**
   * 結果画面を表示
   */
  showResult() {
    // 保存データを取得
    const initialCheck = storage.getInitialCheck();
    const scores = initialCheck.scores;
    const date = initialCheck.date;

    if (!this.result) {
      this.result = scoring.determineType(scores);
    }

    // 質問セクションを非表示
    document.getElementById('questionsSection').classList.remove('active');

    // 結果セクションを表示
    const resultSection = document.getElementById('resultSection');
    resultSection.classList.add('active');

    // 日付を表示
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    document.getElementById('resultDate').textContent = dateStr + ' のチェック結果';

    // スコアを表示
    this.renderScores(scores);

    // フィードバックを表示
    this.renderFeedback();

    // 相談情報を表示
    this.renderConsultation();

    // 再チェックメッセージを表示
    this.renderRecheckMessage(date);

    window.scrollTo(0, 0);
  },

  /**
   * スコアを表示
   */
  renderScores(scores) {
    // レーダーチャートを表示
    this.renderRadarChart(scores);

    // スコアカードを表示
    const grid = document.getElementById('scoresGrid');
    grid.innerHTML = '';

    this.config.domains.forEach(domain => {
      const score = scores[domain.id];
      const rank = scoring.getRankByScore(score);
      const rankLabel = this.config.scoreInterpretation[rank].label;

      const card = document.createElement('div');
      card.className = 'score-card';
      card.innerHTML = `
        <div class="score-card-domain">${domain.name}</div>
        <div class="score-card-value">${score}</div>
        <div class="score-card-label">${rankLabel}</div>
      `;

      grid.appendChild(card);
    });
  },

  /**
   * レーダーチャートを描画
   */
  renderRadarChart(scores) {
    const chartContainer = document.getElementById('resultChart');
    chartContainer.innerHTML = '<canvas id="radarCanvas"></canvas>';

    const labels = this.config.domains.map(d => d.name);
    // スケール反転：大きい = 余白がある（直感的な表示）
    const data = this.config.domains.map(d => 9 - scores[d.id]);

    // 各ポイントの色を決定（元のスコアに基づく）
    const pointColors = this.config.domains.map(d => {
      const score = scores[d.id];
      if (score <= 2) return '#4caf50'; // 余白あり（緑）
      if (score <= 5) return '#ff9800'; // 少し減っている（オレンジ）
      return '#f44336'; // かなり減っている（赤）
    });

    // スケール動的調整：困っているレベルに応じて範囲を変更
    const maxScore = Math.max(...Object.values(scores));
    let chartMax = 9;
    if (maxScore <= 2) {
      chartMax = 3; // 余白が十分にある場合は小さいスケール
    } else if (maxScore <= 5) {
      chartMax = 6; // 少し減っている場合は中程度のスケール
    }

    const ctx = document.getElementById('radarCanvas').getContext('2d');

    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'あなたの余白状態',
          data: data,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          borderWidth: 2,
          pointBackgroundColor: pointColors,
          pointBorderColor: '#fff',
          pointBorderWidth: 3,
          pointRadius: 10,
          pointHoverRadius: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            beginAtZero: true,
            max: chartMax,
            min: 0,
            ticks: {
              stepSize: chartMax === 3 ? 1 : (chartMax === 6 ? 2 : 3),
              font: { size: 12 },
              callback: function(value) {
                // データは反転済み（9 - score）なので：
                // value=0（外輪）= 反転前のスコア9 = 困っていない = 少ない
                // value=chartMax（中心）= 反転前のスコア0 = 困っている = 多い
                if (value === 0) return '少ない';
                if (value === chartMax) return '多い';
                return value;
              }
            },
            grid: {
              color: 'rgba(200, 200, 200, 0.2)'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 14 },
              padding: 15
            }
          }
        }
      }
    });
  },

  /**
   * フィードバックを表示
   */
  renderFeedback() {
    const section = document.getElementById('feedbackSection');

    let typeLabel = '';
    let explanation = '';

    if (this.result.type === 'composite') {
      typeLabel = this.result.name;
      explanation = `複数の領域で余白が減っています。この「${typeLabel}」というパターンが見られました。`;
    } else {
      typeLabel = this.result.domainName;
      explanation = `最も余白が減っている領域は「${typeLabel}」です。`;
    }

    section.innerHTML = `
      <div class="feedback-explanation">${explanation}</div>
      <div class="feedback-type">${typeLabel}</div>
      <div class="feedback-insight-label">気づき</div>
      <div class="feedback-insight">${this.result.insight}</div>
      <div class="feedback-action-label">今日の一歩</div>
      <div class="feedback-action">${this.result.action}</div>
    `;
  },

  /**
   * 相談情報を表示
   */
  renderConsultation() {
    const consultation = this.config.consultation;

    // 準備中判定
    const isPreparing = consultation.status === 'preparing';

    // より詳しい説明に変更
    const consultationMessageText = document.getElementById('consultationMessageText');
    if (isPreparing) {
      consultationMessageText.innerHTML = `
        <strong>${consultation.subtitle}</strong><br>
        親の老いや介護について、不安や疑問がある時には<br>
        いつでも相談できるサービスの準備を進めています。
      `;
    } else {
      consultationMessageText.innerHTML = `
        <strong>介護が始まる前に、今から相談することで</strong><br>
        親との関係、仕事との両立、家族間の調整を整理できます。<br>
        小さな不安や疑問も、プロに相談することで道が見えてきます。
      `;
    }

    // 参考情報セクションを追加
    const consultationSection = document.querySelector('.consultation-section');
    const link = document.getElementById('consultationLink');

    // consultationLink が見つからない場合はスキップ
    if (!link || !consultationSection) {
      console.warn('consultationSection or consultationLink not found');
      return;
    }

    // 既存の参考情報セクションを削除（複数回呼び出し対策）
    const existingRef = consultationSection.querySelector('[style*="f5f5f5"]');
    if (existingRef) existingRef.remove();

    // config から参考情報を取得して表示
    const references = consultation.references || [];

    if (references.length > 0 && !isPreparing) {
      const refDiv = document.createElement('div');
      refDiv.style.backgroundColor = '#f5f5f5';
      refDiv.style.padding = '16px';
      refDiv.style.borderRadius = '8px';
      refDiv.style.marginBottom = '20px';

      let refsHTML = `
        <h3 style="font-size: 16px; color: #333; margin-bottom: 12px; font-weight: 600;">
          まずは情報を知りたい方へ
        </h3>
        <p style="font-size: 13px; color: #666; margin-bottom: 16px;">
          親の老いや介護について、段階的に学べる参考情報です。
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
      `;

      references.forEach(ref => {
        refsHTML += `<a href="${ref.url}" target="_blank" style="padding: 10px; background-color: white; border: 1px solid #ddd; border-radius: 6px; text-decoration: none; color: #2196F3; font-size: 13px;">${ref.title}</a>`;
      });

      refsHTML += `</div>`;
      refDiv.innerHTML = refsHTML;
      link.parentNode.insertBefore(refDiv, link);
    }

    // ボタン表示・非表示の切り替え
    if (isPreparing) {
      link.textContent = '準備中...';
      link.href = '#';
      link.style.opacity = '0.6';
      link.style.cursor = 'not-allowed';
      link.disabled = true;
      link.onclick = (e) => e.preventDefault();
    } else {
      link.textContent = consultation.duration + 'オンライン相談を予約する';
      link.href = consultation.url;
      link.style.opacity = '1';
      link.style.cursor = 'pointer';
      link.disabled = false;
    }
  },

  /**
   * 再チェックメッセージを表示
   */
  renderRecheckMessage(initialDate) {
    const messageDiv = document.getElementById('recheckMessage');
    if (!messageDiv) {
      console.warn('recheckMessage element not found');
      return;
    }

    const message = this.config.recheck.message;

    const initialDate30daysLater = new Date(initialDate);
    initialDate30daysLater.setDate(initialDate30daysLater.getDate() + 30);

    const dateStr = initialDate30daysLater.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    messageDiv.innerHTML = `
      <div class="recheck-message">
        ${message}<br>
        目安：${dateStr}
      </div>
    `;

    // 再チェック可能なら再チェックボタンを表示
    if (storage.isRecheckAvailable()) {
      document.getElementById('recheckBtn').style.display = 'block';
    }
  },

  /**
   * 再チェックを開始
   */
  startRecheck() {
    // 結果セクションを非表示
    document.getElementById('resultSection').classList.remove('active');

    // 再チェックセクションを表示
    const recheckSection = document.getElementById('recheckSection');
    recheckSection.classList.add('active');

    // 比較表を描画
    this.renderComparison();

    // 再チェック質問を描画
    this.renderRecheckQuestions();

    window.scrollTo(0, 0);
  },

  /**
   * 比較表を描画
   */
  renderComparison() {
    const initialCheck = storage.getInitialCheck();
    const initialDate = initialCheck.date;
    const initialScores = initialCheck.scores;

    const comparisonDiv = document.getElementById('comparisonSection');

    let html = `
      <div class="comparison-header">
        前回チェック（${initialDate}）との変化
      </div>
    `;

    this.config.domains.forEach(domain => {
      const initialScore = initialScores[domain.id];
      const currentAnswer = this.answers;
      const currentScores = scoring.calculateScoresByDomain(currentAnswer);
      const currentScore = currentScores[domain.id];

      const comparison = scoring.compareScores(initialScores, currentScores);
      const change = comparison[domain.id];

      let changeLabel = '';
      if (change.type === 'improved') {
        changeLabel = `${change.label} (${initialScore}点 → ${currentScore}点)`;
      } else if (change.type === 'worsened') {
        changeLabel = `${change.label} (${initialScore}点 → ${currentScore}点)`;
      } else {
        changeLabel = `${change.label} (${initialScore}点 → ${currentScore}点)`;
      }

      html += `
        <div class="comparison-item">
          <div class="comparison-domain">${domain.name}</div>
          <div class="comparison-change ${change.type}">${changeLabel}</div>
        </div>
      `;
    });

    comparisonDiv.innerHTML = html;
  },

  /**
   * 再チェック質問を描画
   */
  renderRecheckQuestions() {
    const container = document.getElementById('recheckQuestionsContainer');
    container.innerHTML = '';

    this.config.recheck.questions.forEach(question => {
      const div = document.createElement('div');
      div.className = 'recheck-question';

      div.innerHTML = `
        <label>Q${question.id}. ${question.text}</label>
        <textarea
          id="recheck-q${question.id}"
          placeholder="自由に記入してください"
        ></textarea>
      `;

      container.appendChild(div);
    });
  },

  /**
   * 再チェック結果を保存
   */
  submitRecheck() {
    // 現在のスコアを計算（24問をもう一度回答させる必要があるが、MVP では簡略化）
    // 実装では再度24問チェックするか、前回スコアを使用するかの判定が必要

    const recheckAnswers = {};
    this.config.recheck.questions.forEach(question => {
      const textarea = document.getElementById(`recheck-q${question.id}`);
      recheckAnswers[`q${question.id}`] = textarea.value;
    });

    const today = new Date().toISOString().split('T')[0];
    storage.saveRecheckAnswers(recheckAnswers);

    alert('再チェック結果を保存しました。ご協力ありがとうございます。');
    this.goToTop();
  },

  /**
   * トップへ戻る
   */
  goToTop() {
    // 全セクションを非表示
    document.getElementById('questionsSection').classList.remove('active');
    document.getElementById('resultSection').classList.remove('active');
    document.getElementById('recheckSection').classList.remove('active');

    // 初期化
    this.answers = {};
    this.currentDomainIndex = 0;
    this.result = null;

    // 質問画面を表示
    document.getElementById('questionsSection').classList.add('active');
    this.renderQuestions();
  }
};

// ページ読み込み時に初期化
// 注: index.html で config 読み込み後に app.init() を呼び出すため、ここではコメントアウト
// document.addEventListener('DOMContentLoaded', () => app.init());
