/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { assert, expect, config as chaiConfig } from 'chai';
import { PackagingSObjects } from '@salesforce/packaging';
import { sleep } from '@salesforce/kit';

chaiConfig.truncateThreshold = 0;

type PackageUploadRequest = PackagingSObjects.PackageUploadRequest;

// @ts-ignore
const pollUntilComplete = async (id: string): Promise<PackageUploadRequest> => {
  const result = execCmd<PackageUploadRequest>(`package1:version:create:get -i ${id} -o 1gp --json`, {
    ensureExitCode: 0,
  }).jsonOutput?.result;
  if (result?.Status === 'SUCCESS') {
    return result;
  } else {
    await sleep(5000);
    await pollUntilComplete(id);
  }
};

describe('package1:version:create', () => {
  let session: TestSession;
  let packageId: string | undefined;
  let uploadRequestId: string; // 0Hd

  before(async () => {
    if (!process.env.ONEGP_TESTKIT_AUTH_URL) {
      throw new Error('"ONEGP_TESTKIT_AUTH_URL" env var required for 1gp NUTs');
    }
    session = await TestSession.create({
      project: { name: 'package1VersionCreate' },
      devhubAuthStrategy: 'AUTO',
    });

    const authPath = path.join(process.cwd(), 'authUrl.txt');
    await fs.promises.writeFile(authPath, process.env.ONEGP_TESTKIT_AUTH_URL, 'utf8');

    execCmd(`auth:sfdxurl:store -f ${authPath} -a 1gp`, { ensureExitCode: 0 });

    packageId = execCmd<[{ MetadataPackageId: string }]>('package1:version:list --json -o 1gp', {
      ensureExitCode: 0,
    }).jsonOutput?.result?.at(0)?.MetadataPackageId;

    assert(packageId, 'No 1gp package found in the org');
  });

  after(async () => {
    if (fs.existsSync('authUrl.txt')) await fs.promises.rm('authUrl.txt');
    await session?.clean();
  });
  // we need to the run the synchronous command first, to avoid duplicate package version create API requests in the NUTs
  it(`should create a new 1gp package version for package id ${packageId} and wait`, () => {
    const command = `package1:version:create -n 1gpPackageNUT -i ${packageId} -w 5 -o 1gp`;
    const output = execCmd(command, { ensureExitCode: 0 }).shellOutput.stdout;
    expect(output?.trim()).to.match(/Successfully uploaded package \[04t.{15}]/);
  });

  it(`should create a new 1gp package version for package id ${packageId} and wait (json)`, () => {
    const command = `package1:version:create -n 1gpPackageNUT -i ${packageId} --json -w 5 -o 1gp`;
    const output = execCmd<PackageUploadRequest>(command, { ensureExitCode: 0 }).jsonOutput?.result;
    expect(output?.Status).to.equal('SUCCESS');
    expect(output?.Id).to.be.a('string');
    expect(output?.MetadataPackageId).to.be.a('string');
    expect(output?.MetadataPackageVersionId).to.be.a('string');
    expect(output?.MetadataPackageVersionId.startsWith('04t')).to.be.true;
    expect(output?.MetadataPackageId.startsWith('033')).to.be.true;
  });

  it(`should create a new 1gp package version for package id ${packageId} without waiting`, async () => {
    const command = `package1:version:create -n 1gpPackageNUT -i ${packageId} -o 1gp`;
    const output = execCmd(command, { ensureExitCode: 0 }).shellOutput.stdout;

    // Sometimes the package version is created faster than the test expects for a
    // non-waiting scenario so only verify the enqueued output.
    if (!output.includes('Successfully uploaded package')) {
      expect(output).to.match(/PackageUploadRequest has been enqueued\./);
      expect(output).to.match(/package1:version:create:get -i 0HD.{15} -o/);
      // ensure the package has uploaded by waiting for the package report to be done
      // @ts-ignore
      uploadRequestId = /0HD\w*/.exec(output)?.at(0);
      await pollUntilComplete(uploadRequestId);
    }
  });

  it(`should create a new 1gp package version for package id ${packageId} (json)`, async () => {
    const command = `package1:version:create -n 1gpPackageNUT -i ${packageId} --json -o 1gp`;
    const output = execCmd<PackageUploadRequest>(command, { ensureExitCode: 0 }).jsonOutput?.result;

    // Sometimes the package version is created faster than the test expects for a
    // non-waiting scenario so only verify the enqueued output.
    if (output?.Status !== 'SUCCESS') {
      expect(output?.Status).to.equal('QUEUED');
      expect(output?.Id).to.be.a('string');
      expect(output?.MetadataPackageId).to.be.a('string');
      expect(output?.MetadataPackageVersionId).to.be.a('string');
      expect(output?.MetadataPackageVersionId.startsWith('04t')).to.be.true;
      expect(output?.MetadataPackageId.startsWith('033')).to.be.true;
      // ensure the package has uploaded by waiting for the package report to be done
      // @ts-ignore
      await pollUntilComplete(output?.Id);
    }
    // Use this test's 0Hd if it wasn't already set by the previous test so that
    // tests run later won't fail.
    uploadRequestId ??= output?.Id ?? '';
  });

  describe('package1:version:create:get', () => {
    it('will get the result (human)', () => {
      const command = `package1:version:create:get -i ${uploadRequestId} -o 1gp`;
      const result = execCmd(command, { ensureExitCode: 0 }).shellOutput.stdout;
      expect(result).to.match(/Successfully uploaded package \[04t.{15}]/);
    });

    it('will get the result (json)', () => {
      const command = `package1:version:create:get -i ${uploadRequestId} -o 1gp --json`;
      const result = execCmd<PackageUploadRequest>(command, { ensureExitCode: 0 }).jsonOutput?.result;
      expect(result).to.have.all.keys(
        'Id',
        'attributes',
        'IsDeleted',
        'CreatedDate',
        'CreatedById',
        'LastModifiedDate',
        'LastModifiedById',
        'SystemModstamp',
        'MetadataPackageId',
        'MetadataPackageVersionId',
        'IsReleaseVersion',
        'VersionName',
        'Description',
        'MajorVersion',
        'MinorVersion',
        'ReleaseNotesUrl',
        'PostInstallUrl',
        'Password',
        'Status',
        'Errors'
      );
      expect(result?.Id).to.match(/0HD.{15}/);
      expect(result?.MetadataPackageId).to.match(/033.{15}/);
      expect(result?.MetadataPackageVersionId).to.match(/04t.{15}/);
    });
  });
});
