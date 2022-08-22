/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { PackageVersion, PackageVersionCreateRequestResult } from '@salesforce/packaging';
import * as pkgUtils from '@salesforce/packaging';
import * as chalk from 'chalk';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-packaging', 'package_version_create_report');
const pvclMessages = Messages.loadMessages('@salesforce/plugin-packaging', 'package_version_create_list');
const plMessages = Messages.loadMessages('@salesforce/plugin-packaging', 'package_list');

export class PackageVersionCreateReportCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('cliDescription');
  public static readonly longDescription = messages.getMessage('cliLongDescription');
  public static readonly help = messages.getMessage('help');
  public static readonly;
  public static readonly requiresDevhubUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    packagecreaterequestid: flags.id({
      char: 'i',
      description: messages.getMessage('requestId'),
      longDescription: messages.getMessage('requestIdLong'),
      required: true,
    }),
  };

  public async run(): Promise<PackageVersionCreateRequestResult> {
    const packageVersion = new PackageVersion({ connection: this.hubOrg.getConnection(), project: undefined });
    const result = await packageVersion.getCreateVersionReport(this.flags.packagecreaterequestid);
    this.display(result);
    return result;
  }

  private display(record: PackageVersionCreateRequestResult): void {
    const installUrlValue =
      record.Status === 'Success' ? `${pkgUtils.INSTALL_URL_BASE.toString()}${record.SubscriberPackageVersionId}` : '';

    const data = [
      {
        key: pvclMessages.getMessage('id'),
        value: record.Id,
      },
      {
        key: pvclMessages.getMessage('status'),
        value: pkgUtils.convertCamelCaseStringToSentence(record.Status),
      },
      {
        key: pvclMessages.getMessage('packageId'),
        value: record.Package2Id,
      },
      {
        key: pvclMessages.getMessage('packageVersionId'),
        value: record.Package2VersionId,
      },
      {
        key: pvclMessages.getMessage('subscriberPackageVersionId'),
        value: record.SubscriberPackageVersionId,
      },
      {
        key: pvclMessages.getMessage('tag'),
        value: record.Tag,
      },
      {
        key: pvclMessages.getMessage('branch'),
        value: record.Branch,
      },
      { key: 'Created Date', value: record.CreatedDate },
      {
        key: pvclMessages.getMessage('installUrl'),
        value: installUrlValue,
      },
      {
        key: plMessages.getMessage('createdBy'),
        value: record.CreatedBy,
      },
    ];

    this.ux.styledHeader(chalk.blue('Package Version Create Request'));
    this.ux.table(data, {
      key: { header: 'Name' },
      value: { header: 'Value' },
    });
  }
}
