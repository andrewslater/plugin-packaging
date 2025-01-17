/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Flags, loglevel, orgApiVersionFlagWithDeprecations, SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { Package, PackagingSObjects } from '@salesforce/packaging';
import * as chalk from 'chalk';
import { requiredHubFlag } from '../../utils/hubFlag';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-packaging', 'package_list');

export type Package2Result = Partial<
  Pick<
    PackagingSObjects.Package2,
    | 'Id'
    | 'SubscriberPackageId'
    | 'Name'
    | 'Description'
    | 'NamespacePrefix'
    | 'ContainerOptions'
    | 'ConvertedFromPackageId'
    | 'PackageErrorUsername'
    | 'AppAnalyticsEnabled'
  > & {
    Alias: string;
    CreatedBy: string;
    IsOrgDependent: string;
  }
>;

export type PackageListCommandResult = Package2Result[];

export class PackageListCommand extends SfCommand<PackageListCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly deprecateAliases = true;
  public static readonly aliases = ['force:package:list'];
  public static readonly flags = {
    loglevel,
    'target-dev-hub': requiredHubFlag,
    'api-version': orgApiVersionFlagWithDeprecations,
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
    }),
  };

  private results: Package2Result[] = [];

  public async run(): Promise<PackageListCommandResult> {
    const { flags } = await this.parse(PackageListCommand);
    const connection = flags['target-dev-hub'].getConnection(flags['api-version']);
    const queryResult = await Package.list(connection);
    this.mapRecordsToResults(queryResult);
    this.displayResults(flags.verbose, connection.getApiVersion());
    return this.results;
  }

  private mapRecordsToResults(records: PackagingSObjects.Package2[]): void {
    if (records && records.length > 0) {
      this.results = records
        .filter((record) => record.IsDeprecated === false)
        .map(
          ({
            Id,
            SubscriberPackageId,
            Name,
            Description,
            NamespacePrefix,
            ContainerOptions,
            ConvertedFromPackageId,
            IsOrgDependent,
            PackageErrorUsername,
            AppAnalyticsEnabled,
            CreatedById,
          }) =>
            ({
              Id,
              SubscriberPackageId,
              Name,
              Description,
              NamespacePrefix,
              ContainerOptions,
              ConvertedFromPackageId,
              Alias: this.project.getAliasesFromPackageId(Id).join(),
              IsOrgDependent: ContainerOptions === 'Managed' ? 'N/A' : IsOrgDependent ? 'Yes' : 'No',
              PackageErrorUsername,
              AppAnalyticsEnabled,
              CreatedBy: CreatedById,
            } as Package2Result)
        );
    }
  }

  private displayResults(verbose = false, apiVersion: string): void {
    this.styledHeader(chalk.blue(`Packages [${this.results.length}]`));
    const columns = {
      NamespacePrefix: { header: messages.getMessage('namespace') },
      Name: { header: messages.getMessage('name') },
      Id: { header: messages.getMessage('id') },
      Alias: { header: messages.getMessage('alias') },
      Description: { header: messages.getMessage('description') },
      ContainerOptions: {
        header: messages.getMessage('package-type'),
      },
    };

    if (verbose) {
      Object.assign(columns, {
        SubscriberPackageId: { header: messages.getMessage('package-id') },
        ConvertedFromPackageId: { header: messages.getMessage('convertedFromPackageId') },
        IsOrgDependent: { header: messages.getMessage('isOrgDependent') },
        PackageErrorUsername: { header: messages.getMessage('error-notification-username') },
      });
      if (apiVersion >= '59.0') {
        Object.assign(columns, {
          AppAnalyticsEnabled: { header: messages.getMessage('app-analytics-enabled') },
        });
      }
      Object.assign(columns, {
        CreatedBy: {
          header: messages.getMessage('createdBy'),
        },
      });
    }
    this.table(this.results, columns);
  }
}
