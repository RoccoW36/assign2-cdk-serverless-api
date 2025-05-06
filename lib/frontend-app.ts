import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { RemovalPolicy, CfnOutput } from "aws-cdk-lib";

interface FrontendAppProps {
  apiUrl: string;
  authUrl: string;
}

export class FrontendApp extends Construct {
  constructor(scope: Construct, id: string, props: FrontendAppProps) {
    super(scope, id);

    const siteDomain = `mymoviesapp-${this.node.addr}`;

    const source = new s3.Bucket(this, "source", {
      bucketName: siteDomain,
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, "SiteDistribution", {
      defaultRootObject: "index.html",
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(source, {
          originAccessLevels: [cloudfront.AccessLevel.READ],
        }),
    
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    const config = {
      apiUrl: props.apiUrl,
      authUrl: props.authUrl,
    };

    new s3deploy.BucketDeployment(this, "DeployFrontend", {
      sources: [
        s3deploy.Source.asset("./dist"),
        s3deploy.Source.jsonData("config.json", config),
      ],
      destinationBucket: source,
      distribution,
      distributionPaths: ["/*"],
    });

    new CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
