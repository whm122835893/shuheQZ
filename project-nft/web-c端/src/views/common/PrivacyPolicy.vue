<template>
  <div class="policy-page">
    <div class="policy-header">
      <div class="policy-back" @click="goBack">
        <van-icon name="arrow-left" size="18" color="#333" />
      </div>
      <div class="policy-title">隐私政策</div>
    </div>

    <div class="policy-body">
      <h2 class="doc-title">隐私政策</h2>

      <h3 class="article-title">一、政策概述</h3>
      <p class="text">本隐私政策旨在向用户说明：数和科技有限公司（以下简称"我们"）运营数和数字藏品平台期间，对用户个人信息的收集、使用、存储、保护、共享、注销规则，严格遵守《中华人民共和国个人信息保护法》《网络安全法》等法律法规，全力保护用户个人隐私与信息安全。</p>
      <p class="text">使用数和数字藏品平台服务，即代表您同意本隐私政策全部内容。</p>

      <h3 class="article-title">二、我们收集的个人信息</h3>
      <p class="text">我们仅收集开展平台服务必需的最小范围信息，绝不收集无关隐私信息：</p>
      <p class="clause"><strong>2.1 账号注册与安全信息</strong></p>
      <p class="text">用户本人手机号码，用于账号注册、登录验证、安全风控、接收平台公告及订单通知。</p>
      <p class="clause"><strong>2.2 实名认证必需信息</strong></p>
      <p class="text">依据数藏行业监管、反洗钱、防炒作要求，收集用户真实姓名、居民身份证号码，用于身份核验、账号唯一确权、防范批量违规及账号交易。</p>
      <p class="clause"><strong>2.3 交易与服务信息</strong></p>
      <p class="text">用户订单记录、支付记录、藏品持有记录、转赠记录、操作记录，用于履约服务、订单溯源、售后核查、合规备案。</p>
      <p class="clause"><strong>2.4 设备与日志信息</strong></p>
      <p class="text">用户设备型号、操作系统、IP地址、登录时间、操作日志、设备识别码，用于账号安全防护、盗号识别、作弊风控、异常行为排查。</p>

      <h3 class="article-title">三、个人信息使用范围</h3>
      <p class="text">我们收集的所有信息，仅用于以下合法必要场景，绝不超范围使用：</p>
      <p class="text">3.1 完成账号注册、实名认证、藏品发售、上链确权、订单履约等核心服务；</p>
      <p class="text">3.2 保障账号安全，识别盗号、异常登录、恶意操作、批量违规行为；</p>
      <p class="text">3.3 推送平台上新公告、系统通知、活动提醒（用户可自主关闭营销推送）；</p>
      <p class="text">3.4 响应法律法规、监管部门、司法机关的合规核查要求；</p>
      <p class="text">3.5 优化平台功能、修复系统故障、提升用户服务体验。</p>

      <h3 class="article-title">四、信息存储与安全防护</h3>
      <p class="text">4.1 用户所有个人信息仅存储于中国境内合规服务器，绝不向境外传输、流转用户个人信息。</p>
      <p class="text">4.2 我们采用数据加密、权限隔离、防火墙防护、脱敏存储等安全技术，保护用户实名信息、交易信息安全，严格管控内部人员数据访问权限，杜绝信息泄露、篡改、丢失。</p>
      <p class="text">4.3 信息存储期限：账号存续期间正常留存服务必需信息，账号注销后，依据法律规定留存交易、确权备案记录，其余个人隐私信息全部脱敏清除。</p>

      <h3 class="article-title">五、个人信息共享与披露</h3>
      <p class="text">我们绝不售卖、出租、非法流转用户个人信息，仅在以下合法情形有限共享：</p>
      <p class="text">5.1 委托合规第三方服务商（短信、区块链、风控、支付服务商）提供基础服务，且严格要求第三方保密、仅限履约使用，禁止二次泄露；</p>
      <p class="text">5.2 收到公安、法院、监管部门合法司法文书、行政查询指令，依法配合提供相关信息；</p>
      <p class="text">5.3 经用户本人主动授权、自愿披露的场景。</p>

      <h3 class="article-title">六、用户个人权利</h3>
      <p class="text">6.1 查询权：用户可在个人中心随时查看本人账号信息、订单、藏品、操作记录；</p>
      <p class="text">6.2 更正权：实名信息、绑定信息有误的，可联系平台客服核验更正；</p>
      <p class="text">6.3 注销权：用户可自主申请账号注销，终止个人信息使用；</p>
      <p class="text">6.4 撤回授权：可随时关闭营销推送、非必要权限授权；</p>
      <p class="text">6.5 投诉权：用户对个人隐私处理有异议、发现信息泄露风险，可联系平台客服反馈处理。</p>

      <h3 class="article-title">七、未成年人信息保护</h3>
      <p class="text">平台高度重视未成年人隐私保护，未成年人需经监护人同意并监护使用。若监护人发现未成年人未经授权提交个人信息、违规使用平台服务，可随时联系我们，我们将及时注销账号、清除相关信息。</p>

      <h3 class="article-title">八、政策更新与公示</h3>
      <p class="text">我们可根据法律法规、监管要求适时更新本隐私政策，更新后将在平台首页、用户中心公示，公示即生效，用户持续使用服务视为认可更新后政策。</p>

      <h3 class="article-title">九、联系方式</h3>
      <p class="text">用户关于隐私保护、信息安全的咨询与投诉，可通过平台内置客服、官方预留联系方式与我们沟通。</p>

      <p class="footer">数和科技有限公司</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<style scoped>
.policy-page {
  min-height: 100vh;
  background: #fff;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.policy-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  height: 45px;
  padding: 0 16px;
  padding-top: env(safe-area-inset-top);
  background: #fff;
  border-bottom: 0.5px solid #f0f0f0;
}
.policy-back {
  width: 33px;
  height: 33px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
}
.policy-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.policy-body {
  padding: 20px 16px 40px;
}

.doc-title {
  font-size: 20px;
  font-weight: 700;
  color: #1F2937;
  text-align: center;
  margin-bottom: 20px;
}

.article-title {
  font-size: 15px;
  font-weight: 700;
  color: #1F2937;
  margin-top: 20px;
  margin-bottom: 10px;
}

.clause {
  font-size: 14px;
  color: #1F2937;
  margin-top: 10px;
  margin-bottom: 4px;
}

.text {
  font-size: 14px;
  color: #4B5563;
  line-height: 1.8;
  margin-bottom: 8px;
}

.footer {
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
  text-align: right;
  margin-top: 24px;
}
</style>
