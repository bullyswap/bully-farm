const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const BullyToken = artifacts.require('BullyToken');

contract('BullyToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.bully = await BullyToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.bully.owner()), owner);
        assert.equal((await this.bully.operator()), owner);

        await expectRevert(this.bully.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.bully.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.bully.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.bully.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.bully.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.bully.updateBullySwapRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.bully.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.bully.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.bully.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        await expectRevert(this.bully.transferOperator(this.zeroAddress, { from: operator }), 'BULLY::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        assert.equal((await this.bully.transferTaxRate()).toString(), '500');
        assert.equal((await this.bully.burnRate()).toString(), '20');

        await this.bully.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.bully.transferTaxRate()).toString(), '0');
        await this.bully.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.bully.transferTaxRate()).toString(), '1000');
        await expectRevert(this.bully.updateTransferTaxRate(1001, { from: operator }), 'BULLY::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.bully.updateBurnRate(0, { from: operator });
        assert.equal((await this.bully.burnRate()).toString(), '0');
        await this.bully.updateBurnRate(100, { from: operator });
        assert.equal((await this.bully.burnRate()).toString(), '100');
        await expectRevert(this.bully.updateBurnRate(101, { from: operator }), 'BULLY::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        await this.bully.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.bully.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '0');

        await this.bully.transfer(bob, 12345, { from: alice });
        assert.equal((await this.bully.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.bully.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '494');

        await this.bully.approve(carol, 22345, { from: alice });
        await this.bully.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.bully.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.bully.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        await this.bully.mint(alice, 10000000, { from: owner });
        assert.equal((await this.bully.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '0');

        await this.bully.transfer(bob, 19, { from: alice });
        assert.equal((await this.bully.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.bully.balanceOf(bob)).toString(), '19');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        assert.equal((await this.bully.transferTaxRate()).toString(), '500');
        assert.equal((await this.bully.burnRate()).toString(), '20');

        await this.bully.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.bully.transferTaxRate()).toString(), '0');

        await this.bully.mint(alice, 10000000, { from: owner });
        assert.equal((await this.bully.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '0');

        await this.bully.transfer(bob, 10000, { from: alice });
        assert.equal((await this.bully.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.bully.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        assert.equal((await this.bully.transferTaxRate()).toString(), '500');
        assert.equal((await this.bully.burnRate()).toString(), '20');

        await this.bully.updateBurnRate(0, { from: operator });
        assert.equal((await this.bully.burnRate()).toString(), '0');

        await this.bully.mint(alice, 10000000, { from: owner });
        assert.equal((await this.bully.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '0');

        await this.bully.transfer(bob, 1234, { from: alice });
        assert.equal((await this.bully.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.bully.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        assert.equal((await this.bully.transferTaxRate()).toString(), '500');
        assert.equal((await this.bully.burnRate()).toString(), '20');

        await this.bully.updateBurnRate(100, { from: operator });
        assert.equal((await this.bully.burnRate()).toString(), '100');

        await this.bully.mint(alice, 10000000, { from: owner });
        assert.equal((await this.bully.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '0');

        await this.bully.transfer(bob, 1234, { from: alice });
        assert.equal((await this.bully.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.bully.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.bully.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.bully.balanceOf(this.bully.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.bully.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.bully.maxTransferAmount()).toString(), '0');

        await this.bully.mint(alice, 1000000, { from: owner });
        assert.equal((await this.bully.maxTransferAmount()).toString(), '5000');

        await this.bully.mint(alice, 1000, { from: owner });
        assert.equal((await this.bully.maxTransferAmount()).toString(), '5005');

        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        await this.bully.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.bully.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        assert.equal((await this.bully.isExcludedFromAntiWhale(operator)), false);
        await this.bully.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.bully.isExcludedFromAntiWhale(operator)), true);

        await this.bully.mint(alice, 10000, { from: owner });
        await this.bully.mint(bob, 10000, { from: owner });
        await this.bully.mint(carol, 10000, { from: owner });
        await this.bully.mint(operator, 10000, { from: owner });
        await this.bully.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.bully.maxTransferAmount()).toString(), '250');
        await expectRevert(this.bully.transfer(bob, 251, { from: alice }), 'BULLY::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.bully.approve(carol, 251, { from: alice });
        await expectRevert(this.bully.transferFrom(alice, carol, 251, { from: carol }), 'BULLY::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.bully.transfer(bob, 250, { from: alice });
        await this.bully.transferFrom(alice, carol, 250, { from: carol });

        await this.bully.transfer(this.burnAddress, 251, { from: alice });
        await this.bully.transfer(operator, 251, { from: alice });
        await this.bully.transfer(owner, 251, { from: alice });
        await this.bully.transfer(this.bully.address, 251, { from: alice });

        await this.bully.transfer(alice, 251, { from: operator });
        await this.bully.transfer(alice, 251, { from: owner });
        await this.bully.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.bully.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.bully.swapAndLiquifyEnabled()), false);

        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        await this.bully.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.bully.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.bully.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.bully.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.bully.transferOperator(operator, { from: owner });
        assert.equal((await this.bully.operator()), operator);

        await this.bully.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.bully.minAmountToLiquify()).toString(), '100');
    });
});
