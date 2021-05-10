const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const BullyReferral = artifacts.require('BullyReferral');

contract('BullyReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.bullyReferral = await BullyReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.bullyReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.bullyReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.bullyReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.bullyReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.bullyReferral.operators(operator)).valueOf(), true);

        await this.bullyReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.bullyReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.bullyReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.bullyReferral.operators(operator)).valueOf(), false);
        await this.bullyReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.bullyReferral.operators(operator)).valueOf(), true);

        await this.bullyReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.bullyReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.bullyReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.bullyReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.bullyReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.bullyReferral.referralsCount(referrer)).valueOf(), '0');

        await this.bullyReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.bullyReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.bullyReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.bullyReferral.referralsCount(bob)).valueOf(), '0');
        await this.bullyReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.bullyReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.bullyReferral.getReferrer(alice)).valueOf(), referrer);

        await this.bullyReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.bullyReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.bullyReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.bullyReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.bullyReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.bullyReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.bullyReferral.operators(operator)).valueOf(), true);

        await this.bullyReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.bullyReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.bullyReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.bullyReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.bullyReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.bullyReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.bullyReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.bullyReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
