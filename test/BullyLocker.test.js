const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");
const BullyLocker = artifacts.require('BullyLocker');
const MockBEP20 = artifacts.require('libs/MockBEP20');


contract('BullyLocker', ([alice, bob, carol, owner]) => {
    beforeEach(async () => {
        this.lp1 = await MockBEP20.new('LPToken', 'LP1', '1000000', { from: owner });
        this.bullyLocker = await BullyLocker.new({ from: owner });
    });

    it('only owner', async () => {
        assert.equal((await this.bullyLocker.owner()), owner);

        // lock
        await this.lp1.transfer(this.bullyLocker.address, '2000', { from: owner });
        assert.equal((await this.lp1.balanceOf(this.bullyLocker.address)).toString(), '2000');

        await expectRevert(this.bullyLocker.unlock(this.lp1.address, bob, { from: bob }), 'Ownable: caller is not the owner');
        await this.bullyLocker.unlock(this.lp1.address, carol, { from: owner });
        assert.equal((await this.lp1.balanceOf(carol)).toString(), '2000');
        assert.equal((await this.lp1.balanceOf(this.bullyLocker.address)).toString(), '0');
    });
})
