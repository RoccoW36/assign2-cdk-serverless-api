import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface MovieReviewsTableProps {
  tableName: string;
}

export class MovieReviewsTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: MovieReviewsTableProps) {
    super(scope, id);

    this.table = new dynamodb.Table(this, "MovieReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: props.tableName,
    });

    // Add Global Secondary Index
    this.table.addGlobalSecondaryIndex({
      indexName: "ReviewerIndex",
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewerId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}