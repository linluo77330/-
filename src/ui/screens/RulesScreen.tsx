import { ScreenShell } from '../components/ScreenShell';

interface RulesScreenProps {
  onBack: () => void;
}

export function RulesScreen({ onBack }: RulesScreenProps) {
  return (
    <ScreenShell
      title="胡牌规则"
      subtitle="本游戏当前采用的胡牌与赖子说明"
      footer={
        <button type="button" className="screen-panel__back btn btn--ghost" onClick={onBack}>
          返回主菜单
        </button>
      }
    >
      <div className="rules-content">
        <section className="rules-section">
          <h2 className="rules-section__title">标准胡</h2>
          <p className="rules-section__text">
            手牌与进张合计 14 张，由 <strong>4 组面子</strong> 加 <strong>1 对将</strong> 组成。
          </p>
          <ul className="rules-section__list">
            <li>
              <strong>面子</strong>：顺子（同花色数牌连续三张，如二三四万）或刻子（三张相同牌）。
            </li>
            <li>
              <strong>将</strong>：一对相同牌，即「眼」。
            </li>
            <li>已有鸣牌（吃、碰、杠）每组计 1 个面子，手牌只需再凑齐剩余面子与将。</li>
            <li>数牌（万、筒、条）可组成顺子；风牌、箭牌只能组成刻子。</li>
          </ul>
        </section>

        <section className="rules-section">
          <h2 className="rules-section__title">七对</h2>
          <p className="rules-section__text">
            无鸣牌时，14 张手牌恰好为 <strong>7 个对子</strong>（每种牌 2 张）也可胡牌。
          </p>
          <ul className="rules-section__list">
            <li>必须门清（未吃、碰、杠）。</li>
            <li>七对与标准胡二选一，满足其一即可。</li>
          </ul>
        </section>

        <section className="rules-section">
          <h2 className="rules-section__title">万能牌（赖子）</h2>
          <p className="rules-section__text">
            发牌后翻开牌墙首张作为指示牌；<strong>与该指示牌同型的其余 3 张</strong> 为万能牌，可替代任意牌参与胡牌判定。
          </p>
          <ul className="rules-section__list">
            <li>万能牌在界面上会高亮显示。</li>
            <li>
              若指示牌<strong>不是白板</strong>：手中的白板固定视作指示牌同型，参与胡牌；白板本身不是万能牌，不会高亮。
            </li>
            <li>若指示牌<strong>是白板</strong>：其余三张白板为万能牌；白板不能视作其他牌型。</li>
            <li>赖子可补全顺子、刻子或将牌，七对中也可与实牌配对。</li>
          </ul>
        </section>

        <section className="rules-section">
          <h2 className="rules-section__title">胡牌方式</h2>
          <ul className="rules-section__list">
            <li>
              <strong>荣胡</strong>：他人打出的牌使你凑齐胡牌型，在响应窗口选择「胡」。
            </li>
            <li>
              <strong>自摸</strong>：自己摸到的牌使手牌成形，在出牌阶段可胡（本单机/联机流程以可响应的胡为准）。
            </li>
            <li>
              <strong>听牌</strong>：差一张即可胡。
            </li>
            <li>
              <strong>胡牌展示</strong>：有人胡牌后，会公开其手牌并按将 / 刻 / 顺分组展示胡牌牌型。
            </li>
          </ul>
        </section>
      </div>
    </ScreenShell>
  );
}
