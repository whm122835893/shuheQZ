<template>
  <div class="agreement-page">
    <div class="agreement-header">
      <div class="agreement-back" @click="goBack">
        <van-icon name="arrow-left" size="18" color="#333" />
      </div>
      <div class="agreement-title">用户协议</div>
    </div>

    <div class="agreement-body">
      <h2 class="doc-title">用户协议</h2>

      <h3 class="article-title">第一条 协议效力</h3>
      <p class="clause"><strong>1.1 协议生效</strong></p>
      <p class="text">乙方完成账号注册、勾选同意、登录使用平台任意服务，即视为自愿签署本协议并接受本协议全部条款。本协议即时对双方产生法律约束力。若用户不认可本协议任意条款，需立即停止使用平台所有服务。</p>
      <p class="clause"><strong>1.2 协议修订</strong></p>
      <p class="text">甲方有权根据国家法律法规、监管政策、业务调整需求，随时修订本协议。修订后的协议将在平台首页、用户中心公示，公示后即刻生效。用户继续使用平台服务，视为默认接受最新修订版本。</p>

      <h3 class="article-title">第二条 账号注册</h3>
      <p class="text">2.1 平台实行实名注册制，用户必须使用本人真实有效手机号注册，并完成本人实名认证，禁止使用他人身份、虚假实名。</p>
      <p class="text">2.2 一个有效身份证仅可注册、绑定唯一一个平台账号，严禁一人多号。平台主账号与设备绑定使用。</p>
      <p class="text">2.3 用户账号、登录密码、验证码、支付密码、设备权属均归本人全权保管，因个人泄露、转借、共用等导致的盗号、资产丢失、违规处罚等一切损失，由用户自行承担。</p>
      <p class="text">2.4 任何人不得盗取、窃取、买卖他人信息并在全平台下使用平台服务，未成年人违规操作产生的一切后果，由其监护人承担。</p>
      <p class="text">2.5 平台有权对异常账号、实名存疑账号进行核验、限制功能、冻结处理，用户需配合完成核验工作。</p>

      <h3 class="article-title">第三条 平台服务内容及服务规则</h3>
      <p class="text">3.1 数和数字藏品平台专注数字文创藏品服务，核心服务包含：藏品展示、限量发售、区块链确权、个人藏品持有、合买无偿转赠、订单查询、售后服务等。</p>
      <p class="text">3.2 核心会员须知：平台发售的所有数字藏品，均为数字化文化创意作品，不属于法定货币、证券、基金、理财产品、金融衍生品，无任何投资、保值、增值属性。平台不承诺、不担保藏品任何价值涨幅、升值空间。用户购买数字藏品属于个人文化消费行为，自愿承担一切审美波动、市场热度变化风险。</p>
      <p class="text">3.3 藏品知识产权归属：数字藏品著作权、版权、改编权、使用权归原发行方、创作者所有。用户购买藏品后，仅获得个人非商用观赏、学习、研究、收藏权益，不得用于任何商用、二次改编、复制、传播盈利、批量引进等侵权行为。</p>
      <p class="text">3.4 平台不开放有偿交易、二级市场售卖、加价售卖，仅支持限时无偿转赠、合规转赠，转赠时效、次数、冷却规则以平台实时公示规则为准。</p>

      <h3 class="article-title">第四条 用户禁止行为与违规处罚</h3>
      <p class="text">用户承诺使用平台服务期间，严格遵守法律法规及平台规则，严禁实施下列行为：</p>
      <p class="text">4.1 利用平台藏品进行炒作、溢价倒卖、场外私下交易、代买代拍、资金盘营销等金融化违规炒作行为；</p>
      <p class="text">4.2 使用脚本、外挂、爬虫、群控、批量工具恶意抢购、刷单、骗取平台福利、奖励；</p>
      <p class="text">4.3 伪造、篡改实名信息，冒用他人身份证、文档、转借、批量注册违规账号；</p>
      <p class="text">4.4 在平台内外传播炒作信息、交易收费信息、虚假平台公告，诱导用户参与场外交易、私下交易；</p>
      <p class="text">4.5 侵犯平台、第三方版权、用户合法权益，发布违法、低俗、诈骗、造谣、违规引流内容；</p>
      <p class="text">4.6 利用平台服务从事赌博、传销、洗钱、网络黑灰产等一切违法犯罪活动。</p>
      <p class="text">违规处罚机制：用户触发上述违规行为，平台有权根据违规情节，采取【限制购买、关闭转赠权限、冻结账号、清空违规所得、永久封禁账号】等处罚措施，并追究平台或第三方损失，平台将依法追责、索赔，并配合监管部门及司法机关处理。</p>

      <h3 class="article-title">第五条 购买、确权与退换规则</h3>
      <p class="text">5.1 用户确认下单并支付成功后，平台将完成藏品区块链上链确权，用户可在【我的藏品】中查看藏品属性。</p>
      <p class="text">5.2 数字藏品属于虚拟数字文创商品，上链确权后具有唯一性、不可篡改性，无法定特殊情形，不支持退换货、退款、撤销交易。</p>
      <p class="text">5.3 仅因平台系统故障、重复扣款、未发货、确权失败等平台责任问题，用户有权发起申诉，平台核实后支持退款或重新发货。</p>
      <p class="text">5.4 用户需理性消费，禁止透支消费、借贷消费购买数字藏品，平台不承担任何代偿责任。</p>

      <h3 class="article-title">第六条 账号注销规则</h3>
      <p class="text">6.1 用户可在平台个人中心自主申请账号注销，注销前请确认：账号内无未完成订单、无待处理纠纷、无违规记录、无未到账藏品权益。</p>
      <p class="text">6.2 账号注销后，用户将永久丧失平台账号使用权，藏品持有及转赠权益，账号内所有数据信息将主动清理，不可找回、不可恢复。</p>
      <p class="text">6.3 注销后平台将依据法律法规留存交易、确权记录，用于合规备查，其余个人信息将做脱敏删除。</p>

      <h3 class="article-title">第七条 知识产权保护</h3>
      <p class="text">7.1 平台数字藏品平台页面设计、LOGO、UI界面、文案、程序代码、系统架构知识产权，均归数和科技有限公司独家所有，未经授权授权，禁止任何单位及个人复制、盗用、篡改、商用。</p>
      <p class="text">7.2 平台所有数字藏品文创内容、画面、IP形象、文字素材知识产权归原发行方所有，任何链接侵权行为，平台将配合版权方依法维权。</p>

      <h3 class="article-title">第八条 免责声明</h3>
      <p class="text">8.1 因网络运营商故障、服务器维护、不可抗力（地震、洪水、政策调整、行政监管）等原因导致平台服务中断或部分功能服务暂时中断、延迟、数据短差异等的，平台无需承担赔偿责任。</p>
      <p class="text">8.2 用户私下场外交易、私下转账、私下互换藏品产生的资金损失、藏品灭失、权益受损，平台无义务也无权限干预和保障，平台不承担任何责任，且有权封禁涉事账号。</p>
      <p class="text">8.3 用户需明知区块链区块链技术固有特性及行业风险，因技术规则、市场认知产生的一切风险，由用户自行承担。</p>

      <h3 class="article-title">第九条 争议解决</h3>
      <p class="text">本协议履行过程中产生的任何争议，双方优先友好协商解决；协商不成的，统一向甲方（数和科技有限公司）所在地人民法院提起诉讼。</p>

      <h3 class="article-title">第十条 附则</h3>
      <p class="text">10.1 本协议为平台完整有效服务合约，平台所有公告、规则、活动细则均为本协议补充条款，与本协议具有同等法律效力。</p>
      <p class="text">10.2 本协议最终解释权归数和科技有限公司所有。</p>
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
.agreement-page {
  min-height: 100vh;
  background: #fff;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.agreement-header {
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
.agreement-back {
  width: 33px;
  height: 33px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
}
.agreement-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 17px;
  font-weight: 600;
  color: #333;
}

.agreement-body {
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
</style>
